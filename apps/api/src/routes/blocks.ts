import { Elysia, t } from "elysia";
import {
  db,
  userBlocks,
  follows,
  user as userTable,
  eq,
  and,
  or,
  desc,
  count,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";

export const blocksRoutes = new Elysia({ prefix: "/blocks", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Block a user
  .post(
    "/",
    async (ctx: any) => {
      const { user: authUser, body, set } = ctx;
      const { userId: targetId } = body;

      if (targetId === authUser.id) {
        set.status = 400;
        return { error: "Cannot block yourself" };
      }

      const [target] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.id, targetId));

      if (!target) {
        set.status = 404;
        return { error: "User not found" };
      }

      try {
        await db.insert(userBlocks).values({
          blockerId: authUser.id,
          blockedId: targetId,
        });
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 409;
          return { error: "Already blocked" };
        }
        throw e;
      }

      // Remove follow relationships in both directions
      await db
        .delete(follows)
        .where(
          or(
            and(eq(follows.followerId, authUser.id), eq(follows.followingId, targetId)),
            and(eq(follows.followerId, targetId), eq(follows.followingId, authUser.id))
          )
        );

      return { success: true };
    },
    {
      requireAuth: true,
      body: t.Object({ userId: t.String() }),
    }
  )

  // Unblock a user
  .delete(
    "/:userId",
    async (ctx: any) => {
      const { user: authUser, params, set } = ctx;

      const result = await db
        .delete(userBlocks)
        .where(
          and(
            eq(userBlocks.blockerId, authUser.id),
            eq(userBlocks.blockedId, params.userId)
          )
        )
        .returning();

      if (result.length === 0) {
        set.status = 404;
        return { error: "Block not found" };
      }

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ userId: t.String() }),
    }
  )

  // List blocked users
  .get(
    "/",
    async (ctx: any) => {
      const { user: authUser, query } = ctx;
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const rows = await db
        .select({
          block: userBlocks,
          blocked: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(userBlocks)
        .innerJoin(userTable, eq(userBlocks.blockedId, userTable.id))
        .where(eq(userBlocks.blockerId, authUser.id))
        .orderBy(desc(userBlocks.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(userBlocks)
        .where(eq(userBlocks.blockerId, authUser.id));

      return {
        data: rows.map((r) => ({ ...r.blocked, blockedAt: r.block.createdAt })),
        total: Number(total),
        page,
        limit,
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

  // Check if a user is blocked
  .get(
    "/check/:userId",
    async (ctx: any) => {
      const { user: authUser, params } = ctx;

      const [row] = await db
        .select({ id: userBlocks.id })
        .from(userBlocks)
        .where(
          and(
            eq(userBlocks.blockerId, authUser.id),
            eq(userBlocks.blockedId, params.userId)
          )
        );

      return { blocked: !!row };
    },
    {
      requireAuth: true,
      params: t.Object({ userId: t.String() }),
    }
  );
