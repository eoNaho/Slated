import { Elysia, t } from "elysia";
import {
  db,
  activities,
  user as userTable,
  media,
  reviews,
  follows,
  eq,
  desc,
  inArray,
  and,
  notInArray,
} from "../db";
import { betterAuthPlugin, getOptionalSession } from "../lib/auth";
import { blockedUserIds } from "../lib/block-filter";
import { canViewSection } from "../lib/privacy";

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

      // Use subquery to avoid loading all followed IDs into memory
      const followedSubquery = db
        .select({ id: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, authUser.id));

      // Get activities from followed users (excluding blocked)
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
        .where(
          and(
            inArray(activities.userId, followedSubquery),
            notInArray(activities.userId, blockedUserIds(authUser.id)) as any
          )
        )
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
    async (ctx: any) => {
      const { query, request } = ctx;
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const session = await getOptionalSession(request.headers);
      const authUser = session?.user ?? null;

      const whereClause = authUser
        ? (notInArray(activities.userId, blockedUserIds(authUser.id)) as any)
        : undefined;

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
        .where(whereClause)
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: results.map((r) => {
          let data = {};
          try {
            data = typeof r.activity.metadata === 'string' 
              ? JSON.parse(r.activity.metadata) 
              : r.activity.metadata || {};
          } catch (e) {
            console.error("Failed to parse activity metadata", e);
          }
          return { ...r.activity, data, user: r.user };
        }),
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
  )

  // Get user-specific feed
  .get(
    "/user/:userId",
    async (ctx: any) => {
      const { params, query, request, set } = ctx;
      const session = await getOptionalSession(request.headers);
      const viewerId = session?.user?.id ?? null;

      const allowed = await canViewSection(viewerId, params.userId, "activity");
      if (!allowed) {
        set.status = 403;
        return { error: "This content is private" };
      }

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
        .where(eq(activities.userId, params.userId))
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: results.map((r) => {
          let data = {};
          try {
            data = typeof r.activity.metadata === 'string' 
              ? JSON.parse(r.activity.metadata) 
              : r.activity.metadata || {};
          } catch (e) {
            console.error("Failed to parse activity metadata", e);
          }
          return { ...r.activity, data, user: r.user };
        }),
        page,
        limit,
        hasNext: results.length === limit,
        hasPrev: page > 1,
      };
    },
    {
      params: t.Object({ userId: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  );
