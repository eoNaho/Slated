import { Elysia } from "elysia";
import {
  db,
  user as userTable,
  userSettings,
  userSocialLinks,
  userStats,
  follows,
  clubs,
  clubMembers,
  lists,
  reviews,
  diary,
  eq,
  and,
  or,
  ilike,
  count,
  desc,
  gte,
} from "../db";
import { betterAuthPlugin, getOptionalSession } from "../lib/auth";
import { createNotification } from "./notifications";
import { contentFilterService } from "../services/content-filter";
import { cached, invalidate, TTL } from "../lib/cache";
import { storageService } from "../services/storage";
import { getUserPlanTier } from "../lib/feature-gate";
import { checkProfileAccess } from "../lib/privacy";
import {
  SearchUsersQuery,
  UpdateProfileBody,
  UpdateSocialLinksBody,
  UpdatePrivacyBody,
  UsernameParam,
  UserIdParam,
  RequesterIdParam,
  ListFollowersQuery,
} from "@pixelreel/validators";

function resolveImageUrl(path: string | null): string | null {
  if (!path) return null;
  return storageService.getImageUrl(path);
}

export const usersRoutes = new Elysia({ prefix: "/users", tags: ["Users"] })
  .use(betterAuthPlugin)

  // Get current user profile
  .get(
    "/me",
    async (ctx: any) => {
      const { user } = ctx;

      const [fullUser, settings, socialLinks] = await Promise.all([
        db.select().from(userTable).where(eq(userTable.id, user.id)).limit(1).then(r => r[0]),
        db.select().from(userSettings).where(eq(userSettings.userId, user.id)).then(r => r[0]),
        db.select().from(userSocialLinks).where(eq(userSocialLinks.userId, user.id)).then(r => r[0]),
      ]);

      return {
        data: {
          ...fullUser,
          avatarUrl: resolveImageUrl(fullUser?.avatarUrl ?? null),
          coverUrl: resolveImageUrl(fullUser?.coverUrl ?? null),
          bioExtended: fullUser?.bioExtended
            ? (() => { try { return JSON.parse(fullUser.bioExtended); } catch { return null; } })()
            : null,
          settings,
          socialLinks,
        },
      };
    },
    { requireAuth: true },
  )

  // Search users by query (public)
  .get(
    "/search",
    async ({ query }: any) => {
      const q = (query.q ?? "").trim();
      if (!q || q.length < 2) return { data: [] };

      const results = await db
        .select({
          id: userTable.id,
          username: userTable.username,
          displayName: userTable.displayName,
          avatarUrl: userTable.avatarUrl,
        })
        .from(userTable)
        .where(
          and(
            eq(userTable.status, "active"),
            or(
              ilike(userTable.username, `%${q}%`),
              ilike(userTable.displayName, `%${q}%`),
            ),
          ),
        )
        .limit(10);

      return {
        data: results.map((u) => ({
          ...u,
          avatarUrl: resolveImageUrl(u.avatarUrl),
        })),
      };
    },
    { query: SearchUsersQuery },
  )

  // Get user by username (public, isFollowing included when authenticated)
  .get(
    "/:username",
    async ({ params, set, request }: any) => {
      const [profile] = await db
        .select()
        .from(userTable)
        .where(
          and(
            eq(userTable.username, params.username),
            eq(userTable.status, "active"),
          ),
        )
        .limit(1);

      if (!profile) {
        set.status = 404;
        return { error: "User not found" };
      }

      const session = await getOptionalSession(request.headers);
      const viewerId = session?.user?.id ?? null;

      const [socialLinks, followRow, targetSettings] = await Promise.all([
        db.select().from(userSocialLinks).where(eq(userSocialLinks.userId, profile.id)).then(r => r[0] ?? null),
        viewerId && viewerId !== profile.id
          ? db.select({ status: follows.status }).from(follows).where(and(eq(follows.followerId, viewerId), eq(follows.followingId, profile.id))).limit(1).then(r => r[0] ?? null)
          : Promise.resolve(null),
        db.select({
          isPrivate: userSettings.isPrivate,
          visibilityDiary: userSettings.visibilityDiary,
          visibilityWatchlist: userSettings.visibilityWatchlist,
          visibilityActivity: userSettings.visibilityActivity,
          visibilityReviews: userSettings.visibilityReviews,
          visibilityLists: userSettings.visibilityLists,
          visibilityLikes: userSettings.visibilityLikes,
        }).from(userSettings).where(eq(userSettings.userId, profile.id)).limit(1).then(r => r[0] ?? null),
      ]);

      const { email, ...publicProfile } = profile;
      const isPrivate = targetSettings?.isPrivate ?? false;
      const followStatus: "accepted" | "pending" | "none" =
        followRow?.status === "accepted" ? "accepted"
        : followRow?.status === "pending" ? "pending"
        : "none";
      const isOwnProfile = viewerId === profile.id;
      const canSeeProfile = isOwnProfile || !isPrivate || followStatus === "accepted";

      // Restricted profile view for private accounts the viewer doesn't follow
      if (!canSeeProfile) {
        return {
          data: {
            id: publicProfile.id,
            username: publicProfile.username,
            displayName: publicProfile.displayName,
            avatarUrl: resolveImageUrl(publicProfile.avatarUrl),
            bio: publicProfile.bio,
            isPrivate: true,
            followStatus,
            restricted: true,
          },
        };
      }

      return {
        data: {
          ...publicProfile,
          avatarUrl: resolveImageUrl(publicProfile.avatarUrl),
          coverUrl: resolveImageUrl(publicProfile.coverUrl),
          bioExtended: publicProfile.bioExtended
            ? (() => { try { return JSON.parse(publicProfile.bioExtended); } catch { return null; } })()
            : null,
          socialLinks,
          isFollowing: followStatus === "accepted",
          followStatus,
          isPrivate,
          privacySections: targetSettings ? {
            diary: targetSettings.visibilityDiary,
            watchlist: targetSettings.visibilityWatchlist,
            activity: targetSettings.visibilityActivity,
            reviews: targetSettings.visibilityReviews,
            lists: targetSettings.visibilityLists,
            likes: targetSettings.visibilityLikes,
          } : null,
        },
      };
    },
    { params: UsernameParam },
  )

  // Update current user profile
  .patch(
    "/me",
    async (ctx: any) => {
      const { user, body, set } = ctx;
      const updateData: Record<string, any> = { updatedAt: new Date() };

      // Check bio and displayName for blocked content
      const textsToCheck = [body.displayName, body.bio].filter(Boolean).join(" ");
      if (textsToCheck) {
        const filterResult = await contentFilterService.check(textsToCheck);
        if (filterResult.severity === "high") {
          set.status = 400;
          return { error: "Profile contains content that violates community guidelines" };
        }
      }

      if (body.displayName !== undefined) updateData.displayName = body.displayName;
      if (body.bio !== undefined) updateData.bio = body.bio;
      if (body.location !== undefined) updateData.location = body.location;
      if (body.website !== undefined) updateData.website = body.website;
      if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
      if (body.coverUrl !== undefined) updateData.coverUrl = body.coverUrl;
      if (body.bioExtended !== undefined)
        updateData.bioExtended = body.bioExtended
          ? JSON.stringify(body.bioExtended)
          : null;
      if (body.coverPosition !== undefined) updateData.coverPosition = body.coverPosition;
      if (body.coverZoom !== undefined) updateData.coverZoom = body.coverZoom;

      const [updated] = await db
        .update(userTable)
        .set(updateData)
        .where(eq(userTable.id, user.id))
        .returning();

      return {
        data: {
          ...updated,
          bioExtended: updated.bioExtended
            ? JSON.parse(updated.bioExtended)
            : null,
        },
      };
    },
    {
      requireAuth: true,
      body: UpdateProfileBody,
    },
  )

  // Update current user social links
  .patch(
    "/me/social-links",
    async (ctx: any) => {
      const { user, body } = ctx;

      const [updated] = await db
        .insert(userSocialLinks)
        .values({
          userId: user.id,
          twitter: body.twitter,
          instagram: body.instagram,
          letterboxd: body.letterboxd,
          imdb: body.imdb,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userSocialLinks.userId,
          set: {
            twitter: body.twitter,
            instagram: body.instagram,
            letterboxd: body.letterboxd,
            imdb: body.imdb,
            updatedAt: new Date(),
          },
        })
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      body: UpdateSocialLinksBody,
    },
  )

  // ── Upload avatar ──────────────────────────────────────────────────────────
  .post(
    "/me/avatar",
    async (ctx: any) => {
      const { user, request, set } = ctx;

      const formData = await request.formData();
      const file = formData.get("avatar") as File | null;

      if (!file || typeof file === "string") {
        set.status = 400;
        return { error: "No image file provided" };
      }

      const tier = await getUserPlanTier(user.id);
      const isGif = file.type === "image/gif";

      if (isGif && tier !== "ultra") {
        set.status = 403;
        return { error: "GIF avatars require an Ultra subscription" };
      }

      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(file.type)) {
        set.status = 400;
        return { error: "Only JPEG, PNG, WebP and GIF images are allowed" };
      }

      const MAX_SIZE = isGif ? 8 * 1024 * 1024 : 5 * 1024 * 1024; // 8 MB for GIF, 5 MB otherwise
      if (file.size > MAX_SIZE) {
        set.status = 400;
        return { error: `Image must be under ${isGif ? "8" : "5"} MB` };
      }

      // Delete old avatar if it was a custom upload
      if (user.avatarUrl && !user.avatarUrl.startsWith("http")) {
        await storageService.delete(user.avatarUrl).catch(() => null);
        // Also try to delete the small variant
        await storageService
          .delete(user.avatarUrl.replace(".webp", "-sm.webp"))
          .catch(() => null);
      }

      const buffer = await file.arrayBuffer();
      const { path } = await storageService.uploadAvatar(buffer, `users/${user.id}`, { animated: isGif });

      const [updated] = await db
        .update(userTable)
        .set({ avatarUrl: path, updatedAt: new Date() })
        .where(eq(userTable.id, user.id))
        .returning();

      return { data: { avatarUrl: resolveImageUrl(updated.avatarUrl) } };
    },
    { requireAuth: true },
  )

  // ── Remove avatar ──────────────────────────────────────────────────────────
  .delete(
    "/me/avatar",
    async (ctx: any) => {
      const { user } = ctx;

      if (user.avatarUrl && !user.avatarUrl.startsWith("http")) {
        await storageService.delete(user.avatarUrl).catch(() => null);
        await storageService
          .delete(user.avatarUrl.replace(".webp", "-sm.webp"))
          .catch(() => null);
      }

      const [updated] = await db
        .update(userTable)
        .set({ avatarUrl: null, updatedAt: new Date() })
        .where(eq(userTable.id, user.id))
        .returning();

      return { data: { avatarUrl: null } };
    },
    { requireAuth: true },
  )

  // ── Upload cover/banner ────────────────────────────────────────────────────
  .post(
    "/me/cover",
    async (ctx: any) => {
      const { user, request, set } = ctx;

      const formData = await request.formData();
      const file = formData.get("cover") as File | null;

      if (!file || typeof file === "string") {
        set.status = 400;
        return { error: "No image file provided" };
      }

      const coverTier = await getUserPlanTier(user.id);
      const isCoverGif = file.type === "image/gif";

      if (isCoverGif && coverTier !== "ultra") {
        set.status = 403;
        return { error: "GIF covers require an Ultra subscription" };
      }

      const allowedCover = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      if (!allowedCover.includes(file.type)) {
        set.status = 400;
        return { error: "Only JPEG, PNG, WebP and GIF images are allowed" };
      }

      const MAX_COVER_SIZE = isCoverGif ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > MAX_COVER_SIZE) {
        set.status = 400;
        return { error: `Image must be under ${isCoverGif ? "15" : "10"} MB` };
      }

      // Delete old cover if it was a custom upload
      if (user.coverUrl && !user.coverUrl.startsWith("http")) {
        await storageService.delete(user.coverUrl).catch(() => null);
      }

      const buffer = await file.arrayBuffer();
      const { path } = await storageService.uploadCover(buffer, `users/${user.id}`, { animated: isCoverGif });

      const [updated] = await db
        .update(userTable)
        .set({ coverUrl: path, updatedAt: new Date() })
        .where(eq(userTable.id, user.id))
        .returning();

      return { data: { coverUrl: resolveImageUrl(updated.coverUrl) } };
    },
    { requireAuth: true },
  )

  // ── Remove cover/banner ────────────────────────────────────────────────────
  .delete(
    "/me/cover",
    async (ctx: any) => {
      const { user } = ctx;

      if (user.coverUrl && !user.coverUrl.startsWith("http")) {
        await storageService.delete(user.coverUrl).catch(() => null);
      }

      const [updated] = await db
        .update(userTable)
        .set({ coverUrl: null, updatedAt: new Date() })
        .where(eq(userTable.id, user.id))
        .returning();

      return { data: { coverUrl: null } };
    },
    { requireAuth: true },
  )

  // Get user stats (public)
  .get(
    "/:username/stats",
    async ({ params, set }: any) => {
      const [profile] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(
          and(
            eq(userTable.username, params.username),
            eq(userTable.status, "active"),
          ),
        )
        .limit(1);

      if (!profile) {
        set.status = 404;
        return { error: "User not found" };
      }

      return cached(`user:stats:${profile.id}`, TTL.VOLATILE, async () => {
      // Films watched this year
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);

      const [
        stats,
        [followersRes],
        [followingRes],
        [moviesWatchedRes],
        [reviewsRes],
        [listsRes],
        [thisYearRes],
        [clubsCountRes],
      ] = await Promise.all([
        db.select().from(userStats).where(eq(userStats.userId, profile.id)).limit(1).then((r) => r[0]),
        db.select({ total: count() }).from(follows).where(and(eq(follows.followingId, profile.id), eq(follows.status, "accepted"))),
        db.select({ total: count() }).from(follows).where(and(eq(follows.followerId, profile.id), eq(follows.status, "accepted"))),
        db.select({ total: count() }).from(diary).where(eq(diary.userId, profile.id)),
        db.select({ total: count() }).from(reviews).where(eq(reviews.userId, profile.id)),
        db.select({ total: count() }).from(lists).where(eq(lists.userId, profile.id)),
        db.select({ total: count() }).from(diary).where(and(eq(diary.userId, profile.id), gte(diary.watchedAt, startOfYear.toISOString().split("T")[0]))),
        db.select({ total: count() }).from(clubMembers).where(eq(clubMembers.userId, profile.id)),
      ]);

      const followersCount = Number(followersRes?.total || 0);
      const followingCount = Number(followingRes?.total || 0);
      const moviesWatched = Number(moviesWatchedRes?.total || 0);
      const reviewsCount = Number(reviewsRes?.total || 0);
      const listsCount = Number(listsRes?.total || 0);
      const thisYearCount = Number(thisYearRes?.total || 0);
      const clubsCount = Number(clubsCountRes?.total || 0);

      if (!stats) {
        // Return zeroed stats if not yet created, but with accurate dynamic counts
        return {
          data: {
            userId: profile.id,
            moviesWatched,
            seriesWatched: 0,
            watchTimeMins: 0,
            reviewsCount,
            listsCount,
            followersCount,
            followingCount,
            thisYearCount,
            clubsCount,
            xp: 0,
            level: 1,
            averageRating: null,
          },
        };
      }

      return {
        data: {
          userId: profile.id,
          moviesWatched,
          seriesWatched: stats.seriesWatched ?? 0,
          watchTimeMins: stats.watchTimeMins ?? 0,
          reviewsCount,
          listsCount,
          followersCount,
          followingCount,
          thisYearCount,
          clubsCount,
          xp: stats.xp ?? 0,
          level: stats.level ?? 1,
          averageRating: stats.averageRating ?? null,
        },
      };
      }); // end cached
    },
    { params: UsernameParam },
  )

  // Get user's followers
  .get(
    "/:username/followers",
    async ({ params, query, set }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const [targetUser] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.username, params.username))
        .limit(1);

      if (!targetUser) {
        set.status = 404;
        return { error: "User not found" };
      }

      const followers = await db
        .select({
          id: userTable.id,
          username: userTable.username,
          displayName: userTable.displayName,
          avatarUrl: userTable.avatarUrl,
          isVerified: userTable.isVerified,
        })
        .from(follows)
        .innerJoin(userTable, eq(follows.followerId, userTable.id))
        .where(and(eq(follows.followingId, targetUser.id), eq(follows.status, "accepted")))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(follows)
        .where(and(eq(follows.followingId, targetUser.id), eq(follows.status, "accepted")));

      return {
        data: followers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      };
    },
    {
      params: UsernameParam,
      query: ListFollowersQuery,
    },
  )

  // Get user's following
  .get(
    "/:username/following",
    async ({ params, query, set }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const [targetUser] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.username, params.username))
        .limit(1);

      if (!targetUser) {
        set.status = 404;
        return { error: "User not found" };
      }

      const following = await db
        .select({
          id: userTable.id,
          username: userTable.username,
          displayName: userTable.displayName,
          avatarUrl: userTable.avatarUrl,
          isVerified: userTable.isVerified,
        })
        .from(follows)
        .innerJoin(userTable, eq(follows.followingId, userTable.id))
        .where(and(eq(follows.followerId, targetUser.id), eq(follows.status, "accepted")))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(follows)
        .where(and(eq(follows.followerId, targetUser.id), eq(follows.status, "accepted")));

      return {
        data: following,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      };
    },
    {
      params: UsernameParam,
      query: ListFollowersQuery,
    },
  )

  // Follow a user
  .post(
    "/:userId/follow",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      if (params.userId === user.id) {
        set.status = 400;
        return { error: "Cannot follow yourself" };
      }

      const [targetUser] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.id, params.userId))
        .limit(1);

      if (!targetUser) {
        set.status = 404;
        return { error: "User not found" };
      }

      // Check if target has a private profile
      const targetSettings = await db
        .select({ isPrivate: userSettings.isPrivate })
        .from(userSettings)
        .where(eq(userSettings.userId, targetUser.id))
        .limit(1)
        .then((r) => r[0] ?? { isPrivate: false });

      const status = targetSettings.isPrivate ? "pending" : "accepted";

      try {
        await db.insert(follows).values({
          followerId: user.id,
          followingId: targetUser.id,
          status,
        });
        // Only invalidate stats when actually followed (not pending)
        if (status === "accepted") {
          invalidate(`user:stats:${user.id}`, `user:stats:${targetUser.id}`).catch((err) => console.warn({ err }, "failed to invalidate stats cache after follow"));
        }

        // Notify target user
        const [follower] = await db.select({ displayName: userTable.displayName, username: userTable.username }).from(userTable).where(eq(userTable.id, user.id)).limit(1);
        const name = follower?.displayName || follower?.username || "Someone";
        const url = `/profile/${follower?.username ?? user.id}`;
        if (status === "accepted") {
          createNotification(targetUser.id, "follow", `${name} started following you`, "", { url }, user.id).catch(() => null);
        } else {
          createNotification(targetUser.id, "follow", `${name} requested to follow you`, "", { url }, user.id).catch(() => null);
        }

        return { message: status === "pending" ? "Follow request sent" : "Followed successfully", status };
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 400;
          return { error: "Already following this user" };
        }
        throw e;
      }
    },
    { requireAuth: true, params: UserIdParam },
  )

  // Get clubs a user belongs to (by username)
  // Returns all clubs if viewer is the same user, otherwise only public clubs
  .get(
    "/:username/clubs",
    async (ctx: any) => {
      const { params, request } = ctx;

      const session = await getOptionalSession(request.headers);
      const viewerId = session?.session?.userId ?? session?.user?.id ?? null;

      const [target] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.username, params.username))
        .limit(1);

      if (!target) return { data: [] };

      const isSelf = viewerId === target.id;

      // alias for club owners
      const ownerTable = db
        .select({
          id: userTable.id,
          username: userTable.username,
          displayName: userTable.displayName,
          avatarUrl: userTable.avatarUrl,
        })
        .from(userTable)
        .as("owner");

      const condition = isSelf
        ? eq(clubMembers.userId, target.id)
        : and(eq(clubMembers.userId, target.id), eq(clubs.isPublic, true));

      const memberships = await db
        .select({
          club: clubs,
          role: clubMembers.role,
          owner: {
            id: ownerTable.id,
            username: ownerTable.username,
            displayName: ownerTable.displayName,
            avatarUrl: ownerTable.avatarUrl,
          },
        })
        .from(clubMembers)
        .innerJoin(clubs, eq(clubMembers.clubId, clubs.id))
        .innerJoin(ownerTable, eq(clubs.ownerId, ownerTable.id))
        .where(condition)
        .orderBy(desc(clubMembers.joinedAt));

      return {
        data: memberships.map((m) => ({
          ...m.club,
          coverUrl: storageService.getImageUrl(m.club.coverUrl ?? "") || null,
          owner: m.owner,
          myRole: m.role,
        })),
      };
    },
    { params: UsernameParam },
  )

  // Unfollow a user
  .delete(
    "/:userId/follow",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [targetUser] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.id, params.userId))
        .limit(1);

      if (!targetUser) {
        set.status = 404;
        return { error: "User not found" };
      }

      await db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, user.id),
            eq(follows.followingId, targetUser.id),
          ),
        );

      // Invalidate stats caches for both users
      invalidate(`user:stats:${user.id}`, `user:stats:${targetUser.id}`).catch((err) => console.warn({ err }, "failed to invalidate stats cache after unfollow"));
      return { message: "Unfollowed successfully" };
    },
    { requireAuth: true, params: UserIdParam },
  )

  // Get all custom covers for a user (public — used to display their profile)
  // Uses :username param to avoid conflict, but resolves by ID via query param
  .get(
    "/:username/custom-covers",
    async (ctx: any) => {
      const { params } = ctx;
      const { mediaCustomCovers } = await import("../db");

      const [target] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.username, params.username))
        .limit(1);

      if (!target) return { data: {} };

      const covers = await db
        .select({ mediaId: mediaCustomCovers.mediaId, imagePath: mediaCustomCovers.imagePath })
        .from(mediaCustomCovers)
        .where(eq(mediaCustomCovers.userId, target.id));

      const map: Record<string, string> = {};
      for (const c of covers) {
        map[c.mediaId] = storageService.getImageUrl(c.imagePath);
      }
      return { data: map };
    },
    { params: UsernameParam },
  )

  // ── Privacy Settings ─────────────────────────────────────────────────────

  // Get current user privacy settings
  .get(
    "/me/privacy",
    async (ctx: any) => {
      const { user } = ctx;

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
        .where(eq(userSettings.userId, user.id))
        .limit(1)
        .then((r) => r[0] ?? null);

      // Return defaults if no settings row yet
      return {
        data: settings ?? {
          isPrivate: false,
          visibilityDiary: "public",
          visibilityWatchlist: "public",
          visibilityActivity: "public",
          visibilityReviews: "public",
          visibilityLists: "public",
          visibilityLikes: "public",
        },
      };
    },
    { requireAuth: true },
  )

  // Update current user privacy settings
  .patch(
    "/me/privacy",
    async (ctx: any) => {
      const { user, body } = ctx;

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (body.isPrivate !== undefined) updateData.isPrivate = body.isPrivate;
      if (body.visibilityDiary !== undefined) updateData.visibilityDiary = body.visibilityDiary;
      if (body.visibilityWatchlist !== undefined) updateData.visibilityWatchlist = body.visibilityWatchlist;
      if (body.visibilityActivity !== undefined) updateData.visibilityActivity = body.visibilityActivity;
      if (body.visibilityReviews !== undefined) updateData.visibilityReviews = body.visibilityReviews;
      if (body.visibilityLists !== undefined) updateData.visibilityLists = body.visibilityLists;
      if (body.visibilityLikes !== undefined) updateData.visibilityLikes = body.visibilityLikes;

      const [updated] = await db
        .insert(userSettings)
        .values({ userId: user.id, ...updateData })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: updateData,
        })
        .returning({
          isPrivate: userSettings.isPrivate,
          visibilityDiary: userSettings.visibilityDiary,
          visibilityWatchlist: userSettings.visibilityWatchlist,
          visibilityActivity: userSettings.visibilityActivity,
          visibilityReviews: userSettings.visibilityReviews,
          visibilityLists: userSettings.visibilityLists,
          visibilityLikes: userSettings.visibilityLikes,
        });

      // When switching to public: auto-accept all pending follow requests
      if (body.isPrivate === false) {
        await db
          .update(follows)
          .set({ status: "accepted" })
          .where(and(eq(follows.followingId, user.id), eq(follows.status, "pending")));
        invalidate(`user:stats:${user.id}`).catch(() => null);
      }

      return { data: updated };
    },
    {
      requireAuth: true,
      body: UpdatePrivacyBody,
    },
  )

  // ── Follow Requests ──────────────────────────────────────────────────────

  // List incoming pending follow requests
  .get(
    "/me/follow-requests",
    async (ctx: any) => {
      const { user } = ctx;

      const requests = await db
        .select({
          id: userTable.id,
          username: userTable.username,
          displayName: userTable.displayName,
          avatarUrl: userTable.avatarUrl,
          requestedAt: follows.createdAt,
        })
        .from(follows)
        .innerJoin(userTable, eq(follows.followerId, userTable.id))
        .where(and(eq(follows.followingId, user.id), eq(follows.status, "pending")))
        .orderBy(desc(follows.createdAt));

      return {
        data: requests.map((r) => ({
          ...r,
          avatarUrl: resolveImageUrl(r.avatarUrl),
        })),
      };
    },
    { requireAuth: true },
  )

  // Accept a follow request
  .post(
    "/me/follow-requests/:requesterId/accept",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const updated = await db
        .update(follows)
        .set({ status: "accepted" })
        .where(
          and(
            eq(follows.followerId, params.requesterId),
            eq(follows.followingId, user.id),
            eq(follows.status, "pending"),
          ),
        )
        .returning();

      if (updated.length === 0) {
        set.status = 404;
        return { error: "Follow request not found" };
      }

      invalidate(`user:stats:${user.id}`, `user:stats:${params.requesterId}`).catch(() => null);

      // Notify the requester that their follow request was accepted
      const [accepter] = await db.select({ displayName: userTable.displayName, username: userTable.username }).from(userTable).where(eq(userTable.id, user.id)).limit(1);
      const name = accepter?.displayName || accepter?.username || "Someone";
      createNotification(params.requesterId, "follow", `${name} accepted your follow request`, "", { url: `/profile/${accepter?.username ?? user.id}` }, user.id).catch(() => null);

      return { message: "Follow request accepted" };
    },
    { requireAuth: true, params: RequesterIdParam },
  )

  // Reject a follow request
  .post(
    "/me/follow-requests/:requesterId/reject",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const deleted = await db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, params.requesterId),
            eq(follows.followingId, user.id),
            eq(follows.status, "pending"),
          ),
        )
        .returning();

      if (deleted.length === 0) {
        set.status = 404;
        return { error: "Follow request not found" };
      }

      return { message: "Follow request rejected" };
    },
    { requireAuth: true, params: RequesterIdParam },
  );
