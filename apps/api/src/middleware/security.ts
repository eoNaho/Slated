import { Elysia } from "elysia";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { loggers } from "../utils/logger";

const log = loggers.http;

// ==================== UPSTASH RATE LIMITER ====================

let redis: Redis | null = null;
let rateLimiters: Record<string, Ratelimit> = {};

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

function getRateLimiter(type: "default" | "auth" | "api"): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  if (rateLimiters[type]) return rateLimiters[type];

  const configs = {
    default: Ratelimit.slidingWindow(100, "1 m"),
    auth: Ratelimit.slidingWindow(60, "1 m"),
    api: Ratelimit.slidingWindow(60, "1 m"),
  };

  rateLimiters[type] = new Ratelimit({
    redis: r,
    limiter: configs[type],
    analytics: true,
    prefix: `pixelreel:ratelimit:${type}`,
  });

  return rateLimiters[type];
}

// In-memory fallback
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryRateLimit(
  ip: string,
  max: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = memoryStore.get(ip);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(ip, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1 };
  }

  entry.count++;
  return {
    success: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
  };
}

// ==================== MIDDLEWARE ====================

export function rateLimit(type: "default" | "auth" | "api" = "default") {
  const limits = { default: 100, auth: 60, api: 60 };
  const max = limits[type];

  return new Elysia({ name: `rate-limit-${type}` }).derive(
    { as: "scoped" },
    async ({ request, set }) => {
      // Prefer X-Real-IP (set by a trusted reverse proxy) over X-Forwarded-For,
      // which can be spoofed by clients. Never trust the leftmost X-Forwarded-For
      // value directly — only the rightmost entry added by your own proxy is safe.
      const ip =
        request.headers.get("x-real-ip") ||
        request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
        "unknown";

      const limiter = getRateLimiter(type);
      let success: boolean, remaining: number;

      if (limiter) {
        const result = await limiter.limit(ip);
        success = result.success;
        remaining = result.remaining;
        set.headers["X-RateLimit-Reset"] = String(result.reset);
      } else {
        const result = inMemoryRateLimit(ip, max, 60000);
        success = result.success;
        remaining = result.remaining;
      }

      set.headers["X-RateLimit-Limit"] = String(max);
      set.headers["X-RateLimit-Remaining"] = String(remaining);

      if (!success) {
        set.status = 429;
        throw new Error("Too Many Requests");
      }

      return { clientIp: ip };
    }
  );
}

export function securityHeaders() {
  const applyHeaders = ({ set }: { set: any }) => {
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-XSS-Protection"] = "1; mode=block";
    set.headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains; preload";
    set.headers["Content-Security-Policy"] =
      "default-src 'self'; script-src 'none'; object-src 'none'; frame-ancestors 'none'";
    set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    set.headers["Permissions-Policy"] =
      "camera=(), microphone=(), geolocation=()";
  };

  return new Elysia({ name: "security-headers" })
    .onAfterHandle({ as: "global" }, applyHeaders)
    .onError({ as: "global" }, applyHeaders);
}

export function requestLogger() {
  return new Elysia({ name: "request-logger" })
    .onRequest(({ request }) => {
      const url = new URL(request.url);
      (request as any).__startTime = Date.now();

      if (!url.pathname.includes("/health")) {
        log.info({ method: request.method, path: url.pathname }, "Request");
      }
    })
    .onAfterHandle(({ request, set }) => {
      const start = (request as any).__startTime || Date.now();
      const duration = Date.now() - start;
      const url = new URL(request.url);

      if (!url.pathname.includes("/health")) {
        log.info(
          { status: set.status || 200, path: url.pathname, ms: duration },
          "Response"
        );
      }
    });
}

// ==================== UTILITIES ====================

export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .slice(0, 10000);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export async function hashData(data: string): Promise<string> {
  const salt = process.env.HASH_SALT;
  if (!salt) throw new Error("HASH_SALT environment variable is required");
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
