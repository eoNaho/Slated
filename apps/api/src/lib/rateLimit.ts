// Simple in-memory rate limiter for Elysia
// For production, consider Redis-based solution

import { Elysia } from "elysia";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  max: number; // Max requests
  window: number; // Window in seconds
  message?: string; // Error message
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // Clean every minute

export const rateLimit = (
  config: RateLimitConfig = { max: 100, window: 60 }
) => {
  return new Elysia({ name: "rate-limit" }).onBeforeHandle(
    ({ request, set }) => {
      const ip =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";

      const key = `${ip}:${new URL(request.url).pathname}`;
      const now = Date.now();
      const windowMs = config.window * 1000;

      let entry = store.get(key);

      if (!entry || entry.resetAt < now) {
        entry = { count: 0, resetAt: now + windowMs };
        store.set(key, entry);
      }

      entry.count++;

      // Set rate limit headers
      set.headers["X-RateLimit-Limit"] = config.max.toString();
      set.headers["X-RateLimit-Remaining"] = Math.max(
        0,
        config.max - entry.count
      ).toString();
      set.headers["X-RateLimit-Reset"] = Math.ceil(
        entry.resetAt / 1000
      ).toString();

      if (entry.count > config.max) {
        set.status = 429;
        set.headers["Retry-After"] = Math.ceil(
          (entry.resetAt - now) / 1000
        ).toString();
        return {
          error: "Too Many Requests",
          message:
            config.message ||
            `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
        };
      }
    }
  );
};

// Pre-configured limiters
export const globalLimiter = rateLimit({ max: 100, window: 60 });
export const authLimiter = rateLimit({
  max: 5,
  window: 60,
  message: "Too many login attempts. Please wait.",
});
export const sensitiveLimiter = rateLimit({ max: 10, window: 60 });
