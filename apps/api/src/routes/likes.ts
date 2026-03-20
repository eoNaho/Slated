import { Elysia, t } from "elysia";
import { db, likes, activities, eq, and } from "../db";
import { betterAuthPlugin } from "../lib/auth";

export const likesRoutes = new Elysia({ prefix: "/likes", tags: ["Social"] })
  .use(betterAuthPlugin)

  /**
   * POST /likes
   * Like a target (media, review, list)
   */
  .post(
    "/",
    async (ctx: any) => {
      const { user, body, set } = ctx;

      try {
        const [existing] = await db
          .select()
          .from(likes)
          .where(
            and(
              eq(likes.userId, user.id),
              eq(likes.targetType, body.targetType),
              eq(likes.targetId, body.targetId)
            )
          )
          .limit(1);

        if (existing) {
          return { data: existing, isNew: false };
        }

        const [newLike] = await db
          .insert(likes)
          .values({
            userId: user.id,
            targetType: body.targetType,
            targetId: body.targetId,
          })
          .returning();

        // Create activity
        await db.insert(activities).values({
          userId: user.id,
          type: "like",
          targetType: body.targetType,
          targetId: body.targetId,
        });

        // Depending on targetType, we might want to increment likesCount 
        // using the increment_likes function from DB trigger/rpc, but we'll leave that to the DB trigger or do it manually if needed.
        // There is a RPC `increment_likes` in the 0001_security_and_triggers.sql but not accessible via Drizzle directly without sql``.
        if (body.targetType === "review") {
            const { reviews } = await import("../db");
            const { sql } = await import("drizzle-orm");
            await db.update(reviews).set({ likesCount: sql`${reviews.likesCount} + 1` }).where(eq(reviews.id, body.targetId));
        } else if (body.targetType === "list") {
            const { lists } = await import("../db");
            const { sql } = await import("drizzle-orm");
            await db.update(lists).set({ likesCount: sql`${lists.likesCount} + 1` }).where(eq(lists.id, body.targetId));
        }

        return { data: newLike, isNew: true };
      } catch (e: any) {
        if (e.code === "23505") { // unique violation
          set.status = 400;
          return { error: "Already liked" };
        }
        throw e;
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        targetType: t.Union([t.Literal("media"), t.Literal("review"), t.Literal("list")]),
        targetId: t.String(),
      }),
    }
  )

  /**
   * DELETE /likes/:targetType/:targetId
   * Unlike a target
   */
  .delete(
    "/:targetType/:targetId",
    async (ctx: any) => {
      const { user, params } = ctx;

      await db
        .delete(likes)
        .where(
          and(
            eq(likes.userId, user.id),
            eq(likes.targetType, params.targetType),
            eq(likes.targetId, params.targetId)
          )
        );

      // Decrement logic
      if (params.targetType === "review") {
          const { reviews } = await import("../db");
          const { sql } = await import("drizzle-orm");
          await db.update(reviews).set({ likesCount: sql`GREATEST(${reviews.likesCount} - 1, 0)` }).where(eq(reviews.id, params.targetId));
      } else if (params.targetType === "list") {
          const { lists } = await import("../db");
          const { sql } = await import("drizzle-orm");
          await db.update(lists).set({ likesCount: sql`GREATEST(${lists.likesCount} - 1, 0)` }).where(eq(lists.id, params.targetId));
      }

      return { success: true, message: "Like removed" };
    },
    {
      requireAuth: true,
      params: t.Object({ 
        targetType: t.Union([t.Literal("media"), t.Literal("review"), t.Literal("list")]),
        targetId: t.String() 
      }),
    }
  );
