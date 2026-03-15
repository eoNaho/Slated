import { Elysia, t } from "elysia";
import {
  db,
  activities,
  user,
  media,
  reviews,
  follows,
  eq,
  desc,
  inArray,
  and,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";

export const feedRoutes = new Elysia({ prefix: "/feed", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get personalized feed (from followed user)
  .get(
    "/",
    async (ctx: any) => {
      const { user: authUser, query } = ctx;

      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      // Get followed user IDs
      const followedUsers = await db
        .select({ id: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, authUser.id));

      const followedIds = followedUsers.map((f) => f.id);

      if (followedIds.length === 0) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          hasNext: false,
          hasPrev: false,
        };
      }

      // Get activities from followed user
      const results = await db
        .select({
          activity: activities,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(activities)
        .innerJoin(userTable, eq(activities.userId, userTable.id))
        .where(inArray(activities.userId, followedIds))
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: results.map((r) => ({ ...r.activity, user: r.user })),
        page,
        limit,
        hasNext: results.length === limit,
        hasPrev: page > 1,
      };
    },
    {
      requireAuth: true,
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // Get global/trending feed
  .get(
    "/global",
    async ({ query }) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const results = await db
        .select({
          activity: activities,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(activities)
        .innerJoin(userTable, eq(activities.userId, userTable.id))
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: results.map((r) => ({ ...r.activity, user: r.user })),
        page,
        limit,
        hasNext: results.length === limit,
        hasPrev: page > 1,
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  );
