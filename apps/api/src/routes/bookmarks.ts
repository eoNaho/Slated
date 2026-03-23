import { Elysia, t } from "elysia";
import { db, bookmarks, media, reviews, lists, user, eq, and, desc, inArray } from "../db";
import { betterAuthPlugin } from "../lib/auth";

export const bookmarksRoutes = new Elysia({ prefix: "/bookmarks", tags: ["Social"] })
  .use(betterAuthPlugin)

  /**
   * POST /bookmarks
   * Bookmark a target (media, review, list). Idempotent.
   */
  .post(
    "/",
    async (ctx: any) => {
      const { user, body } = ctx;

      const [existing] = await db
        .select()
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, user.id),
            eq(bookmarks.targetType, body.targetType),
            eq(bookmarks.targetId, body.targetId)
          )
        )
        .limit(1);

      if (existing) {
        return { data: existing, isNew: false };
      }

      const [bookmark] = await db
        .insert(bookmarks)
        .values({
          userId: user.id,
          targetType: body.targetType,
          targetId: body.targetId,
          note: body.note,
        })
        .returning();

      return { data: bookmark, isNew: true };
    },
    {
      requireAuth: true,
      body: t.Object({
        targetType: t.Union([t.Literal("media"), t.Literal("review"), t.Literal("list")]),
        targetId: t.String(),
        note: t.Optional(t.String()),
      }),
    }
  )

  /**
   * DELETE /bookmarks/:targetType/:targetId
   * Remove a bookmark.
   */
  .delete(
    "/:targetType/:targetId",
    async (ctx: any) => {
      const { user, params } = ctx;

      await db
        .delete(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, user.id),
            eq(bookmarks.targetType, params.targetType),
            eq(bookmarks.targetId, params.targetId)
          )
        );

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({
        targetType: t.Union([t.Literal("media"), t.Literal("review"), t.Literal("list")]),
        targetId: t.String(),
      }),
    }
  )

  /**
   * GET /bookmarks/check/:targetType/:targetId
   * Quick boolean check if the current user has bookmarked an item.
   */
  .get(
    "/check/:targetType/:targetId",
    async (ctx: any) => {
      const { user, params } = ctx;

      const [existing] = await db
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, user.id),
            eq(bookmarks.targetType, params.targetType),
            eq(bookmarks.targetId, params.targetId)
          )
        )
        .limit(1);

      return { bookmarked: !!existing };
    },
    {
      requireAuth: true,
      params: t.Object({
        targetType: t.Union([t.Literal("media"), t.Literal("review"), t.Literal("list")]),
        targetId: t.String(),
      }),
    }
  )

  /**
   * GET /bookmarks
   * List current user's bookmarks. Optionally filter by targetType.
   */
  .get(
    "/",
    async (ctx: any) => {
      const { user, query } = ctx;
      const page = Number(query.page ?? 1);
      const limit = Math.min(Number(query.limit ?? 20), 50);
      const offset = (page - 1) * limit;

      const conditions = [eq(bookmarks.userId, user.id)];
      if (query.targetType) {
        conditions.push(eq(bookmarks.targetType, query.targetType));
      }

      const rows = await db
        .select()
        .from(bookmarks)
        .where(and(...conditions))
        .orderBy(desc(bookmarks.createdAt))
        .limit(limit)
        .offset(offset);

      if (rows.length === 0) return { data: [], pagination: { page, limit, hasMore: false } };

      // Enrich with actual content data
      const mediaIds = rows.filter((r) => r.targetType === "media").map((r) => r.targetId);
      const reviewIds = rows.filter((r) => r.targetType === "review").map((r) => r.targetId);
      const listIds = rows.filter((r) => r.targetType === "list").map((r) => r.targetId);

      const [mediaItems, reviewItems, listItems] = await Promise.all([
        mediaIds.length
          ? db.select({ id: media.id, title: media.title, posterPath: media.posterPath, slug: media.slug, type: media.type, releaseDate: media.releaseDate }).from(media).where(inArray(media.id, mediaIds))
          : [],
        reviewIds.length
          ? db.select({ id: reviews.id, content: reviews.content, rating: reviews.rating, mediaId: reviews.mediaId, mediaTitle: media.title, mediaPoster: media.posterPath, mediaSlug: media.slug, authorUsername: user.username }).from(reviews).leftJoin(media, eq(reviews.mediaId, media.id)).leftJoin(user, eq(reviews.userId, user.id)).where(inArray(reviews.id, reviewIds))
          : [],
        listIds.length
          ? db.select({ id: lists.id, name: lists.name, description: lists.description, itemsCount: lists.itemsCount, slug: lists.slug, ownerUsername: user.username }).from(lists).leftJoin(user, eq(lists.userId, user.id)).where(inArray(lists.id, listIds))
          : [],
      ]);

      const mediaMap = Object.fromEntries(mediaItems.map((m) => [m.id, m]));
      const reviewMap = Object.fromEntries(reviewItems.map((r) => [r.id, r]));
      const listMap = Object.fromEntries(listItems.map((l) => [l.id, l]));

      const enriched = rows.map((r) => ({
        ...r,
        target: r.targetType === "media" ? mediaMap[r.targetId]
          : r.targetType === "review" ? reviewMap[r.targetId]
          : listMap[r.targetId],
      }));

      return {
        data: enriched,
        pagination: { page, limit, hasMore: rows.length === limit },
      };
    },
    {
      requireAuth: true,
      query: t.Object({
        targetType: t.Optional(
          t.Union([t.Literal("media"), t.Literal("review"), t.Literal("list")])
        ),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  );
