import { db, planFeatureFlags, subscriptions, plans, eq, and } from "../db";
import { cache } from "./redis";

const CACHE_TTL = 300; // 5 minutes
const CACHE_KEY = "feature_flags";

type PlanTier = "free" | "pro" | "ultra";

// In-memory fallback cache for when Redis is unavailable
let memCache: Record<string, Record<string, boolean>> | null = null;
let memCacheExpiry = 0;

// Load all flags from DB
async function loadFlags(): Promise<Record<string, Record<string, boolean>>> {
  const flags = await db.select().from(planFeatureFlags);
  const map: Record<string, Record<string, boolean>> = {};
  for (const flag of flags) {
    if (!map[flag.featureKey]) map[flag.featureKey] = {};
    map[flag.featureKey][flag.plan] = flag.enabled ?? false;
  }
  // Try Redis first, fall back to in-memory
  await cache.set(CACHE_KEY, map, CACHE_TTL);
  memCache = map;
  memCacheExpiry = Date.now() + CACHE_TTL * 1000;
  return map;
}

async function getFlags(): Promise<Record<string, Record<string, boolean>>> {
  // Check in-memory cache first (avoids Redis round-trip when Redis is down)
  if (memCache && Date.now() < memCacheExpiry) return memCache;
  const cached = await cache.get<Record<string, Record<string, boolean>>>(CACHE_KEY);
  if (cached) {
    memCache = cached;
    memCacheExpiry = Date.now() + CACHE_TTL * 1000;
    return cached;
  }
  return loadFlags();
}

export async function invalidateFlagsCache(): Promise<void> {
  memCache = null;
  memCacheExpiry = 0;
  await cache.del(CACHE_KEY);
}

// Resolve the plan tier for a user based on their active subscription
export async function getUserPlanTier(userId: string): Promise<PlanTier> {
  const [sub] = await db
    .select({ slug: plans.slug })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"))
    )
    .limit(1);

  const slug = sub?.slug?.toLowerCase() ?? "";
  if (slug === "ultra") return "ultra";
  if (slug === "pro") return "pro";
  return "free";
}

// Check if a feature is enabled for a user's plan tier
export async function checkFeature(
  userId: string,
  featureKey: string
): Promise<boolean> {
  const tier = await getUserPlanTier(userId);
  const flags = await getFlags();
  return flags[featureKey]?.[tier] ?? false;
}

// Check feature by tier directly (when tier is already known)
export async function checkFeatureForTier(
  tier: PlanTier,
  featureKey: string
): Promise<boolean> {
  const flags = await getFlags();
  return flags[featureKey]?.[tier] ?? false;
}

// Get all features for a given tier (for settings page)
export async function getFeaturesForTier(
  tier: PlanTier
): Promise<Record<string, boolean>> {
  const flags = await getFlags();
  const result: Record<string, boolean> = {};
  for (const [key, plans] of Object.entries(flags)) {
    result[key] = plans[tier] ?? false;
  }
  return result;
}
