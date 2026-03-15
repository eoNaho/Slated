import { Elysia, t } from "elysia";
import {
  db,
  reviews,
  media,
  user,
  likes,
  activities,
  eq,
  and,
  desc,
  count,
  sql,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";

export const reviewsRoutes = new Elysia({ prefix: "/reviews", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get recent reviews
  .get(
    "/",
    async ({ query }) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const conditions = [];
      if (query.media_id) conditions.push(eq(reviews.mediaId, query.media_id));
      if (query.user_id) conditions.push(eq(reviews.userId, query.user_id));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select({
          review: reviews,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          },
          media: {
            id: media.id,
            title: media.title,
            posterPath: media.posterPath,
            releaseDate: media.releaseDate,
            type: media.type,
          },
        })
        .from(reviews)
        .innerJoin(user, eq(reviews.userId, user.id))
        .innerJoin(media, eq(reviews.mediaId, media.id))
        .where(whereClause)
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(reviews)
        .where(whereClause);

      return {
        data: results.map((r) => ({
          ...r.review,
          user: r.user,
          media: r.media,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        media_id: t.Optional(t.String()),
        user_id: t.Optional(t.String()),
      }),
    },
  )

  // Get single review
  .get("/:id", async ({ params, set }) => {
    const [result] = await db
      .select({
        review: reviews,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        media: {
          id: media.id,
          title: media.title,
          posterPath: media.posterPath,
          releaseDate: media.releaseDate,
          type: media.type,
        },
      })
      .from(reviews)
      .innerJoin(user, eq(reviews.userId, user.id))
      .innerJoin(media, eq(reviews.mediaId, media.id))
      .where(eq(reviews.id, params.id))
      .limit(1);

    if (!result) {
      set.status = 404;
      return { error: "Review not found" };
    }

    return {
      data: { ...result.review, user: result.user, media: result.media },
    };
  })

  // Create review
  .post(
    "/",
    async (ctx: any) => {
      const { user: authUser, body } = ctx;

      const [newReview] = await db
        .insert(reviews)
        .values({
          userId: authUser.id,
          mediaId: body.media_id,
          content: body.content,
          rating: body.rating,
          containsSpoilers: body.contains_spoilers ?? false,
          title: body.title,
        })
        .returning();

      // Create activity
      await db.insert(activities).values({
        userId: authUser.id,
        type: "review",
        targetType: "review",
        targetId: newReview.id,
        metadata: JSON.stringify({ rating: body.rating }),
      });

      return { data: newReview };
    },
    {
      requireAuth: true,
      body: t.Object({
        media_id: t.String(),
        content: t.String({ minLength: 10 }),
        rating: t.Optional(t.Number({ minimum: 0.5, maximum: 5 })),
        contains_spoilers: t.Optional(t.Boolean()),
        title: t.Optional(t.String()),
      }),
    },
  )

  // Update review
  .patch(
    "/:id",
    async (ctx: any) => {
      const { user: authUser, params, body, set } = ctx;

      const [existing] = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, params.id))
        .limit(1);
      if (!existing) {
        set.status = 404;
        return { error: "Review not found" };
      }

      if (existing.userId !== authUser.id) {
        set.status = 403;
        return { error: "Forbidden" };
      }

      const [updated] = await db
        .update(reviews)
        .set({
          content: body.content,
          rating: body.rating,
          containsSpoilers: body.contains_spoilers,
          title: body.title,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, params.id))
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        content: t.Optional(t.String({ minLength: 10 })),
        rating: t.Optional(t.Number({ minimum: 0.5, maximum: 5 })),
        contains_spoilers: t.Optional(t.Boolean()),
        title: t.Optional(t.String()),
      }),
    },
  )

  // Delete review
  .delete(
    "/:id",
    async (ctx: any) => {
      const { user: authUser, params, set } = ctx;

      const [existing] = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, params.id))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Review not found" };
      }

      if (existing.userId !== authUser.id) {
        set.status = 403;
        return { error: "Forbidden" };
      }

      await db.delete(reviews).where(eq(reviews.id, params.id));

      set.status = 204;
      return null;
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    },
  )

  // Like Review
  .post(
    "/:id/like",
    async (ctx: any) => {
      const { user: authUser, params, set } = ctx;

      try {
        await db.insert(likes).values({
          userId: authUser.id,
          targetType: "review",
          targetId: params.id,
        });

        // Update review likes count
        await db
          .update(reviews)
          .set({ likesCount: sql`${reviews.likesCount} + 1` })
          .where(eq(reviews.id, params.id));

        return { success: true };
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
      params: t.Object({ id: t.String() }),
    },
  )

  // Unlike Review
  .delete(
    "/:id/like",
    async (ctx: any) => {
      const { user: authUser, params } = ctx;

      const deleted = await db
        .delete(likes)
        .where(
          and(
            eq(likes.userId, authUser.id),
            eq(likes.targetType, "review"),
            eq(likes.targetId, params.id),
          ),
        )
        .returning();

      if (deleted.length > 0) {
        // Decrement likes count
        await db
          .update(reviews)
          .set({ likesCount: sql`${reviews.likesCount} - 1` })
          .where(eq(reviews.id, params.id));
      }

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    },
  );
