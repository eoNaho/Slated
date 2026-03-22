import { cache } from "./redis";

// TTL tiers (seconds)
export const TTL = {
  STATIC: 3600,    // 1 hour  — genres, countries
  EXPENSIVE: 300,  // 5 min   — trending, popular, platform stats
  VOLATILE: 60,    // 1 min   — user stats, media details
} as const;

/**
 * Cache-aside helper. Returns cached value if present, otherwise calls fn,
 * stores the result, and returns it. Fails open (calls fn) if Redis is down.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = await cache.get<T>(key);
  if (hit !== null) return hit;

  const value = await fn();
  // Fire-and-forget — don't let cache write failures block the response
  cache.set(key, value, ttlSeconds).catch(() => {});
  return value;
}

/**
 * Invalidate one or more cache keys.
 */
export async function invalidate(...keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => cache.del(k)));
}
