import { Elysia, t } from "elysia";
import {
  db,
  user as userTable,
  userSettings,
  userSocialLinks,
  userStats,
  follows,
  clubs,
  clubMembers,
  eq,
  and,
  count,
  desc,
} from "../db";
import { betterAuthPlugin, getOptionalSession } from "../lib/auth";
import { storageService } from "../services/storage";

export const usersRoutes = new Elysia({ prefix: "/users", tags: ["Users"] })
  .use(betterAuthPlugin)

  // Get current user profile
  .get("/me", async (ctx: any) => {
    const { user } = ctx;
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id));
    const [socialLinks] = await db
      .select()
      .from(userSocialLinks)
      .where(eq(userSocialLinks.userId, user.id));

    return {
      data: {
        ...user,
        settings,
        socialLinks,
      },
    };
  }, { requireAuth: true })

  // Get user by username (public)
  .get(
    "/:username",
    async ({ params, set }: any) => {
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

      const [socialLinks] = await db
        .select()
        .from(userSocialLinks)
        .where(eq(userSocialLinks.userId, profile.id));

      const { email, ...publicProfile } = profile;

      return {
        data: {
          ...publicProfile,
          socialLinks,
        },
      };
    },
    { params: t.Object({ username: t.String() }) },
  )

  // Update current user profile
  .patch(
    "/me",
    async (ctx: any) => {
      const { user, body } = ctx;
      const [updated] = await db
        .update(userTable)
        .set({
          displayName: body.displayName,
          bio: body.bio,
          location: body.location,
          website: body.website,
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, user.id))
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      body: t.Object({
        displayName: t.Optional(t.String()),
        bio: t.Optional(t.String()),
        location: t.Optional(t.String()),
        website: t.Optional(t.String()),
      }),
    },
  )

  // Get user stats (public)
  .get(
    "/:username/stats",
    async ({ params, set }: any) => {
      const [profile] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(and(eq(userTable.username, params.username), eq(userTable.status, "active")))
        .limit(1);

      if (!profile) {
        set.status = 404;
        return { error: "User not found" };
      }

      const [stats] = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, profile.id))
        .limit(1);

      if (!stats) {
        // Return zeroed stats if not yet created
        return {
          data: {
            userId: profile.id,
            moviesWatched: 0,
            seriesWatched: 0,
            watchTimeMins: 0,
            reviewsCount: 0,
            listsCount: 0,
            followersCount: 0,
            followingCount: 0,
            xp: 0,
            level: 1,
            averageRating: null,
          },
        };
      }

      const [{ followersCount }] = await db
        .select({ followersCount: count() })
        .from(follows)
        .where(eq(follows.followingId, profile.id));

      const [{ followingCount }] = await db
        .select({ followingCount: count() })
        .from(follows)
        .where(eq(follows.followerId, profile.id));

      return {
        data: {
          userId: profile.id,
          moviesWatched: stats.moviesWatched ?? 0,
          seriesWatched: stats.seriesWatched ?? 0,
          watchTimeMins: stats.watchTimeMins ?? 0,
          reviewsCount: stats.reviewsCount ?? 0,
          listsCount: stats.listsCount ?? 0,
          followersCount: Number(followersCount),
          followingCount: Number(followingCount),
          xp: stats.xp ?? 0,
          level: stats.level ?? 1,
          averageRating: stats.averageRating ?? null,
        },
      };
    },
    { params: t.Object({ username: t.String() }) },
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
        .where(eq(follows.followingId, targetUser.id))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(follows)
        .where(eq(follows.followingId, targetUser.id));

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
      params: t.Object({ username: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
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
        .where(eq(follows.followerId, targetUser.id))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(follows)
        .where(eq(follows.followerId, targetUser.id));

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
      params: t.Object({ username: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
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

      try {
        await db.insert(follows).values({
          followerId: user.id,
          followingId: targetUser.id,
        });
        return { message: "Followed successfully" };
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 400;
          return { error: "Already following this user" };
        }
        throw e;
      }
    },
    { requireAuth: true, params: t.Object({ userId: t.String() }) },
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
      const ownerTable = db.select({
        id: userTable.id,
        username: userTable.username,
        displayName: userTable.displayName,
        avatarUrl: userTable.avatarUrl,
      }).from(userTable).as("owner");

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
    { params: t.Object({ username: t.String() }) }
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

      return { message: "Unfollowed successfully" };
    },
    { requireAuth: true, params: t.Object({ userId: t.String() }) },
  );
