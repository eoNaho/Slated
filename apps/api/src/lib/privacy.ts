import { db, follows, userSettings, eq, and } from "../db";

export type VisibilityLevel = "public" | "followers" | "private";
export type SectionName = "diary" | "watchlist" | "activity" | "reviews" | "lists" | "likes";

interface ProfileAccess {
  allowed: boolean;
  isFollower: boolean;
  isPending: boolean;
  isPrivateProfile: boolean;
}

/**
 * Checks whether a viewer can access a profile at all and returns relationship metadata.
 * Follows the same pattern as canSendDm() in routes/messages.ts.
 */
export async function checkProfileAccess(
  viewerId: string | null,
  targetUserId: string
): Promise<ProfileAccess> {
  // Own profile: always full access
  if (viewerId === targetUserId) {
    return { allowed: true, isFollower: true, isPending: false, isPrivateProfile: false };
  }

  const settings = await db
    .select({
      isPrivate: userSettings.isPrivate,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, targetUserId))
    .limit(1)
    .then((r) => r[0] ?? { isPrivate: false });

  if (!settings.isPrivate) {
    return { allowed: true, isFollower: false, isPending: false, isPrivateProfile: false };
  }

  // Private profile — check follow relationship
  if (!viewerId) {
    return { allowed: false, isFollower: false, isPending: false, isPrivateProfile: true };
  }

  const followRow = await db
    .select({ status: follows.status })
    .from(follows)
    .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, targetUserId)))
    .limit(1)
    .then((r) => r[0] ?? null);

  const isFollower = followRow?.status === "accepted";
  const isPending = followRow?.status === "pending";

  return {
    allowed: isFollower,
    isFollower,
    isPending,
    isPrivateProfile: true,
  };
}

/**
 * Checks whether a viewer can see a specific section of a user's profile.
 * Returns false if denied (caller should return 403).
 */
export async function canViewSection(
  viewerId: string | null,
  targetUserId: string,
  section: SectionName
): Promise<boolean> {
  // Own profile: always allowed
  if (viewerId === targetUserId) return true;

  const settings = await db
    .select({
      isPrivate: userSettings.isPrivate,
      visibilityDiary: userSettings.visibilityDiary,
      visibilityWatchlist: userSettings.visibilityWatchlist,
      visibilityActivity: userSettings.visibilityActivity,
      visibilityReviews: userSettings.visibilityReviews,
      visibilityLists: userSettings.visibilityLists,
      visibilityLikes: userSettings.visibilityLikes,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, targetUserId))
    .limit(1)
    .then((r) => r[0] ?? null);

  // No settings row → treat as all public
  if (!settings) return true;

  const visibilityMap: Record<SectionName, string> = {
    diary: settings.visibilityDiary,
    watchlist: settings.visibilityWatchlist,
    activity: settings.visibilityActivity,
    reviews: settings.visibilityReviews,
    lists: settings.visibilityLists,
    likes: settings.visibilityLikes,
  };

  const visibility = visibilityMap[section] as VisibilityLevel;

  // Private profile gate: if private and viewer is not accepted follower, block everything
  if (settings.isPrivate) {
    if (!viewerId) return false;
    const followRow = await db
      .select({ status: follows.status })
      .from(follows)
      .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, targetUserId)))
      .limit(1)
      .then((r) => r[0] ?? null);
    if (followRow?.status !== "accepted") return false;
  }

  // Section-level visibility
  if (visibility === "public") return true;
  if (visibility === "private") return false;

  // "followers" — need to check follow status
  if (!viewerId) return false;
  const followRow = await db
    .select({ status: follows.status })
    .from(follows)
    .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, targetUserId)))
    .limit(1)
    .then((r) => r[0] ?? null);
  return followRow?.status === "accepted";
}
