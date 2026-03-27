import { Elysia, t } from "elysia";
import {
  db,
  reviews,
  media,
  user,
  likes,
  activities,
  contentFlags,
  eq,
  and,
  desc,
  count,
  sql,
  notInArray,
} from "../db";
import { betterAuthPlugin, getOptionalSession } from "../lib/auth";
import { blockedUserIds } from "../lib/block-filter";
import { canViewSection } from "../lib/privacy";
import { contentFilterService } from "../services/content-filter";
import { checkContentVelocity } from "../lib/moderation-escalation";

export const reviewsRoutes = new Elysia({ prefix: "/reviews", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get recent reviews
  .get(
    "/",
    async (ctx: any) => {
      const { query, request, set } = ctx;
      const authUser = ctx.user ?? null;
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      // Privacy check when filtering by a specific user's reviews
      if (query.user_id) {
        const session = await getOptionalSession(request.headers);
        const viewerId = session?.user?.id ?? null;
        const allowed = await canViewSection(viewerId, query.user_id, "reviews");
        if (!allowed) {
          set.status = 403;
          return { error: "This content is private" };
        }
      }

      const conditions: ReturnType<typeof eq>[] = [];
      conditions.push(eq(reviews.isHidden, false));
      if (query.media_id)  conditions.push(eq(reviews.mediaId, query.media_id));
      if (query.user_id)   conditions.push(eq(reviews.userId, query.user_id));
      if (query.season_id) conditions.push(eq(reviews.seasonId, query.season_id));
      if (query.episode_id) conditions.push(eq(reviews.episodeId, query.episode_id));
      if (query.source)    conditions.push(eq(reviews.source, query.source));
      if (authUser) conditions.push(notInArray(reviews.userId, blockedUserIds(authUser.id)) as any);
      const whereClause = and(...conditions);

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
        season_id: t.Optional(t.String()),
        episode_id: t.Optional(t.String()),
        source: t.Optional(t.String()),
      }),
    },
  )

  // Get single review
  .get("/:id", async (ctx: any) => {
    const { params, set } = ctx;
    const authUser = ctx.user ?? null;

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

    const isOwner = authUser?.id === result.review.userId;
    const isStaff = authUser?.role === "admin" || authUser?.role === "moderator";
    if (result.review.isHidden && !isOwner && !isStaff) {
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

      const [filterResult] = await Promise.all([
        contentFilterService.check(body.content ?? ""),
        checkContentVelocity(authUser.id, "review"),
      ]);

      const [newReview] = await db
        .insert(reviews)
        .values({
          userId: authUser.id,
          mediaId: body.media_id,
          seasonId: body.season_id ?? null,
          episodeId: body.episode_id ?? null,
          content: body.content,
          rating: body.rating,
          containsSpoilers: body.contains_spoilers ?? false,
          title: body.title,
          source: "manual",
          isHidden: filterResult.shouldAutoHide,
          hiddenReason: filterResult.shouldAutoHide ? "Automated: content policy violation" : null,
          hiddenAt: filterResult.shouldAutoHide ? new Date() : null,
        })
        .returning();

      if (filterResult.flagged) {
        await db.insert(contentFlags).values({
          targetType: "review",
          targetId: newReview.id,
          flagType: filterResult.matches[0]?.type ?? "profanity",
          severity: filterResult.severity === "none" ? "low" : filterResult.severity,
          details: JSON.stringify(filterResult.matches),
          autoActioned: filterResult.shouldAutoHide,
        });
      }

      // Create activity
      await db.insert(activities).values({
        userId: authUser.id,
        type: "review",
        targetType: "review",
        targetId: newReview.id,
        metadata: JSON.stringify({
          rating: body.rating,
          season_id: body.season_id,
          episode_id: body.episode_id,
        }),
      });

      return { data: newReview };
    },
    {
      requireAuth: true,
      body: t.Object({
        media_id: t.String(),
        season_id: t.Optional(t.String()),
        episode_id: t.Optional(t.String()),
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

      const updateValues: Record<string, unknown> = {
        content: body.content,
        rating: body.rating,
        containsSpoilers: body.contains_spoilers,
        title: body.title,
        updatedAt: new Date(),
      };

      if (body.content) {
        const filterResult = await contentFilterService.check(body.content);
        if (filterResult.shouldAutoHide) {
          updateValues.isHidden = true;
          updateValues.hiddenReason = "Automated: content policy violation";
          updateValues.hiddenAt = new Date();
        }
        if (filterResult.flagged) {
          await db.insert(contentFlags).values({
            targetType: "review",
            targetId: params.id,
            flagType: filterResult.matches[0]?.type ?? "profanity",
            severity: filterResult.severity === "none" ? "low" : filterResult.severity,
            details: JSON.stringify(filterResult.matches),
            autoActioned: filterResult.shouldAutoHide,
          });
        }
      }

      const [updated] = await db
        .update(reviews)
        .set(updateValues as any)
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
