import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || "",
  token: process.env.UPSTASH_REDIS_TOKEN || "",
});

// Check if Redis is configured
export const isRedisConfigured = () => {
  return !!(process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN);
};

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!isRedisConfigured()) return null;
    try {
      return await redis.get(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!isRedisConfigured()) return;
    try {
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
      } else {
        await redis.set(key, JSON.stringify(value));
      }
    } catch (e) {
      console.error("Redis set error:", e);
    }
  },

  async del(key: string): Promise<void> {
    if (!isRedisConfigured()) return;
    try {
      await redis.del(key);
    } catch (e) {
      console.error("Redis del error:", e);
    }
  },

  async incr(key: string): Promise<number> {
    if (!isRedisConfigured()) return 0;
    try {
      return await redis.incr(key);
    } catch {
      return 0;
    }
  },
};

// Rate limit with Redis
export const redisRateLimit = async (
  key: string,
  max: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => {
  if (!isRedisConfigured()) {
    return {
      allowed: true,
      remaining: max,
      resetAt: Date.now() + windowSeconds * 1000,
    };
  }

  const redisKey = `ratelimit:${key}`;
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `${redisKey}:${Math.floor(now / windowSeconds)}`;

  try {
    const count = await redis.incr(windowKey);

    // Set expiry on first request
    if (count === 1) {
      await redis.expire(windowKey, windowSeconds);
    }

    const remaining = Math.max(0, max - count);
    const resetAt =
      (Math.floor(now / windowSeconds) + 1) * windowSeconds * 1000;

    return {
      allowed: count <= max,
      remaining,
      resetAt,
    };
  } catch {
    // Fail open - allow request if Redis fails
    return {
      allowed: true,
      remaining: max,
      resetAt: Date.now() + windowSeconds * 1000,
    };
  }
};
