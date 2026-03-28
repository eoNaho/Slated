import { Elysia } from "elysia";
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
import { createNotification } from "./notifications";
import { blockedUserIds } from "../lib/block-filter";
import { canViewSection } from "../lib/privacy";
import { contentFilterService } from "../services/content-filter";
import { checkContentVelocity } from "../lib/moderation-escalation";
import { notifyTasteMatchReview } from "../services/recommendation-notifications";
import {
  ListReviewsQuery,
  CreateReviewBody,
  UpdateReviewBody,
  IdParam,
} from "@pixelreel/validators";
import { ok, paginated } from "../utils/response";

export const reviewsRoutes = new Elysia({ prefix: "/reviews", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get recent reviews
  .get(
    "/",
    async ({ query, request, set, ...ctx }) => {
      const authUser = (ctx as any).user ?? null;
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
      if (query.media_id)   conditions.push(eq(reviews.mediaId, query.media_id));
      if (query.user_id)    conditions.push(eq(reviews.userId, query.user_id));
      if (query.season_id)  conditions.push(eq(reviews.seasonId, query.season_id));
      if (query.episode_id) conditions.push(eq(reviews.episodeId, query.episode_id));
      if (query.source)     conditions.push(eq(reviews.source, query.source));
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

      return paginated(
        results.map((r) => ({ ...r.review, user: r.user, media: r.media })),
        total,
        page,
        limit,
      );
    },
    { query: ListReviewsQuery },
  )

  // Get single review
  .get("/:id", async ({ params, set, ...ctx }) => {
    const authUser = (ctx as any).user ?? null;

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

    return ok({ ...result.review, user: result.user, media: result.media });
  })

  // Create review
  .post(
    "/",
    async ({ body, set, ...ctx }) => {
      const authUser = (ctx as any).user;

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

      notifyTasteMatchReview(authUser.id, body.media_id).catch(() => {});

      return ok(newReview);
    },
    {
      requireAuth: true,
      body: CreateReviewBody,
    },
  )

  // Update review
  .patch(
    "/:id",
    async ({ params, body, set, ...ctx }) => {
      const authUser = (ctx as any).user;

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

      return ok(updated);
    },
    {
      requireAuth: true,
      params: IdParam,
      body: UpdateReviewBody,
    },
  )

  // Delete review
  .delete(
    "/:id",
    async ({ params, set, ...ctx }) => {
      const authUser = (ctx as any).user;

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
      params: IdParam,
    },
  )

  // Like Review
  .post(
    "/:id/like",
    async ({ params, set, ...ctx }) => {
      const authUser = (ctx as any).user;

      try {
        await db.insert(likes).values({
          userId: authUser.id,
          targetType: "review",
          targetId: params.id,
        });

        const [updatedReview] = await db
          .update(reviews)
          .set({ likesCount: sql`${reviews.likesCount} + 1` })
          .where(eq(reviews.id, params.id))
          .returning({ userId: reviews.userId });

        if (updatedReview && updatedReview.userId !== authUser.id) {
          const [liker] = await db.select({ displayName: user.displayName, username: user.username }).from(user).where(eq(user.id, authUser.id)).limit(1);
          const name = liker?.displayName || liker?.username || "Someone";
          createNotification(updatedReview.userId, "like", `${name} liked your review`, "", { url: `/reviews/${params.id}`, targetType: "review", targetId: params.id }, authUser.id).catch(() => null);
        }

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
      params: IdParam,
    },
  )

  // Unlike Review
  .delete(
    "/:id/like",
    async ({ params, ...ctx }) => {
      const authUser = (ctx as any).user;

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
        await db
          .update(reviews)
          .set({ likesCount: sql`${reviews.likesCount} - 1` })
          .where(eq(reviews.id, params.id));
      }

      return { success: true };
    },
    {
      requireAuth: true,
      params: IdParam,
    },
  );
