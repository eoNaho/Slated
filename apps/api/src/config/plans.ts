// Plan limits for PixelReel tiers
export const PLAN_LIMITS = {
  free: {
    clubs: { maxMembers: 50, maxCreated: 3 },
    favorites: { max: 4 },
  },
  pro: {
    clubs: { maxMembers: 200, maxCreated: 10 },
    favorites: { max: 10 },
  },
  ultra: {
    clubs: { maxMembers: 500, maxCreated: 20 },
    favorites: { max: 10 },
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

export function planTierFromSubscription(plan: string | null | undefined): PlanTier {
  if (plan === "ultra") return "ultra";
  if (plan === "pro" || plan === "premium") return "pro";
  return "free";
}
