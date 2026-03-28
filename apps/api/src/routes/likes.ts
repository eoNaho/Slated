import { Elysia } from "elysia";
import { db, likes, activities, media, reviews, lists, user as userTable, eq, and, inArray, desc } from "../db";
import { betterAuthPlugin, getOptionalSession } from "../lib/auth";
import { canViewSection } from "../lib/privacy";
import { tasteProfileService } from "../services/recommendation.service";
import { createNotification } from "./notifications";
import { LikeBody, LikeParams, LikedMediaQuery, UserIdParam } from "@pixelreel/validators";
import { ok } from "../utils/response";

export const likesRoutes = new Elysia({ prefix: "/likes", tags: ["Social"] })
  .use(betterAuthPlugin)

  // POST /likes — like a target (media, review, list)
  .post(
    "/",
    async ({ body, set, ...ctx }) => {
      const user = (ctx as any).user;

      try {
        const [existing] = await db
          .select()
          .from(likes)
          .where(
            and(
              eq(likes.userId, user.id),
              eq(likes.targetType, body.targetType),
              eq(likes.targetId, body.targetId),
            ),
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

        await db.insert(activities).values({
          userId: user.id,
          type: "like",
          targetType: body.targetType,
          targetId: body.targetId,
        });

        if (body.targetType === "review") {
          const { reviews } = await import("../db");
          const { sql } = await import("drizzle-orm");
          await db.update(reviews).set({ likesCount: sql`${reviews.likesCount} + 1` }).where(eq(reviews.id, body.targetId));
        } else if (body.targetType === "list") {
          const { lists } = await import("../db");
          const { sql } = await import("drizzle-orm");
          await db.update(lists).set({ likesCount: sql`${lists.likesCount} + 1` }).where(eq(lists.id, body.targetId));
        }

        if (body.targetType === "review") {
          const [review] = await db.select({ userId: reviews.userId, id: reviews.id }).from(reviews).where(eq(reviews.id, body.targetId)).limit(1);
          if (review && review.userId !== user.id) {
            const [liker] = await db.select({ displayName: userTable.displayName, username: userTable.username }).from(userTable).where(eq(userTable.id, user.id)).limit(1);
            const name = liker?.displayName || liker?.username || "Someone";
            createNotification(review.userId, "like", `${name} liked your review`, "", { url: `/reviews/${review.id}`, targetType: "review", targetId: review.id }, user.id).catch(() => null);
          }
        } else if (body.targetType === "list") {
          const [list] = await db.select({ userId: lists.userId, id: lists.id }).from(lists).where(eq(lists.id, body.targetId)).limit(1);
          if (list && list.userId !== user.id) {
            const [liker] = await db.select({ displayName: userTable.displayName, username: userTable.username }).from(userTable).where(eq(userTable.id, user.id)).limit(1);
            const name = liker?.displayName || liker?.username || "Someone";
            createNotification(list.userId, "like", `${name} liked your list`, "", { url: `/lists/${list.id}`, targetType: "list", targetId: list.id }, user.id).catch(() => null);
          }
        }

        if (body.targetType === "media") {
          tasteProfileService.invalidate(user.id).catch(() => null);
        }

        return { data: newLike, isNew: true };
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 400;
          return { error: "Already liked" };
        }
        throw e;
      }
    },
    {
      requireAuth: true,
      body: LikeBody,
    },
  )

  // GET /likes/media/user/:userId — liked media by a user
  .get(
    "/media/user/:userId",
    async ({ params, query, request, set }) => {
      const session = await getOptionalSession(request.headers);
      const viewerId = session?.user?.id ?? null;

      const allowed = await canViewSection(viewerId, params.userId, "likes");
      if (!allowed) {
        set.status = 403;
        return { error: "This content is private" };
      }

      const limit = Math.min(Number(query.limit ?? 24), 100);
      const offset = Number(query.offset ?? 0);

      const likedRows = await db
        .select({
          id: likes.id,
          createdAt: likes.createdAt,
          mediaId: likes.targetId,
        })
        .from(likes)
        .where(and(eq(likes.userId, params.userId), eq(likes.targetType, "media")))
        .orderBy(desc(likes.createdAt))
        .limit(limit)
        .offset(offset);

      if (likedRows.length === 0) return ok([]);

      const mediaIds = likedRows.map((r) => r.mediaId);
      const mediaItems = await db
        .select({
          id: media.id,
          title: media.title,
          slug: media.slug,
          posterPath: media.posterPath,
          type: media.type,
          releaseDate: media.releaseDate,
        })
        .from(media)
        .where(inArray(media.id, mediaIds));

      const mediaMap = Object.fromEntries(mediaItems.map((m) => [m.id, m]));
      const data = likedRows
        .map((r) => ({ id: r.id, createdAt: r.createdAt, media: mediaMap[r.mediaId] }))
        .filter((r) => !!r.media);

      return ok(data);
    },
    {
      params: UserIdParam,
      query: LikedMediaQuery,
    },
  )

  // DELETE /likes/:targetType/:targetId — unlike a target
  .delete(
    "/:targetType/:targetId",
    async ({ params, ...ctx }) => {
      const user = (ctx as any).user;

      await db
        .delete(likes)
        .where(
          and(
            eq(likes.userId, user.id),
            eq(likes.targetType, params.targetType),
            eq(likes.targetId, params.targetId),
          ),
        );

      if (params.targetType === "review") {
        const { reviews } = await import("../db");
        const { sql } = await import("drizzle-orm");
        await db.update(reviews).set({ likesCount: sql`GREATEST(${reviews.likesCount} - 1, 0)` }).where(eq(reviews.id, params.targetId));
      } else if (params.targetType === "list") {
        const { lists } = await import("../db");
        const { sql } = await import("drizzle-orm");
        await db.update(lists).set({ likesCount: sql`GREATEST(${lists.likesCount} - 1, 0)` }).where(eq(lists.id, params.targetId));
      }

      if (params.targetType === "media") {
        tasteProfileService.invalidate(user.id).catch(() => null);
      }

      return { success: true, message: "Like removed" };
    },
    {
      requireAuth: true,
      params: LikeParams,
    },
  );
