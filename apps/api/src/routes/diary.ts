import { Elysia } from "elysia";
import { db, diary, reviews, media, eq, and, desc, count, isNull } from "../db";
import { betterAuthPlugin } from "../lib/auth";
import { PaginationQuery, IdParam, CreateDiaryEntryBody, UpdateDiaryEntryBody } from "@pixelreel/validators";
import { tasteProfileService } from "../services/recommendation.service";
import { recommendationFeedback } from "../db/schema/recommendations";

export const diaryRoutes = new Elysia({ prefix: "/diary", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get user's diary
  .get(
    "/",
    async (ctx: any) => {
      const { user, query } = ctx;

      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 100);
      const offset = (page - 1) * limit;

      const results = await db
        .select({
          entry: diary,
          media: {
            id: media.id,
            title: media.title,
            posterPath: media.posterPath,
            releaseDate: media.releaseDate,
            type: media.type,
          },
        })
        .from(diary)
        .innerJoin(media, eq(diary.mediaId, media.id))
        .where(eq(diary.userId, user.id))
        .orderBy(desc(diary.watchedAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(diary)
        .where(eq(diary.userId, user.id));

      return {
        data: results.map((r) => ({ ...r.entry, media: r.media })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      };
    },
    {
      requireAuth: true,
      query: PaginationQuery,
    }
  )

  // Log new entry
  .post(
    "/",
    async (ctx: any) => {
      const { user, body } = ctx;

      const [newEntry] = await db
        .insert(diary)
        .values({
          userId: user.id,
          mediaId: body.media_id,
          watchedAt: body.watched_at || new Date().toISOString().split("T")[0],
          rating: body.rating,
          isRewatch: body.is_rewatch ?? false,
          notes: body.notes,
        })
        .returning();

      // Note: User stats updated by trigger 'update_user_stats_on_watch'

      // Auto-link a review when notes are present and no manual review exists
      if (body.notes && body.notes.length >= 10) {
        const [existingManual] = await db
          .select({ id: reviews.id })
          .from(reviews)
          .where(
            and(
              eq(reviews.userId, user.id),
              eq(reviews.mediaId, body.media_id),
              eq(reviews.source, "manual"),
              isNull(reviews.seasonId),
              isNull(reviews.episodeId),
            ),
          )
          .limit(1);

        if (!existingManual) {
          const [existingDiary] = await db
            .select({ id: reviews.id })
            .from(reviews)
            .where(
              and(
                eq(reviews.userId, user.id),
                eq(reviews.mediaId, body.media_id),
                eq(reviews.source, "diary"),
                isNull(reviews.seasonId),
                isNull(reviews.episodeId),
              ),
            )
            .limit(1);

          let linkedReviewId: string;
          if (existingDiary) {
            const [updated] = await db
              .update(reviews)
              .set({
                title: body.review_title ?? null,
                content: body.notes,
                rating: body.rating,
                containsSpoilers: body.contains_spoilers ?? false,
                updatedAt: new Date(),
              })
              .where(eq(reviews.id, existingDiary.id))
              .returning({ id: reviews.id });
            linkedReviewId = updated.id;
          } else {
            const [created] = await db
              .insert(reviews)
              .values({
                userId: user.id,
                mediaId: body.media_id,
                title: body.review_title ?? null,
                content: body.notes,
                rating: body.rating,
                containsSpoilers: body.contains_spoilers ?? false,
                source: "diary",
              })
              .returning({ id: reviews.id });
            linkedReviewId = created.id;
          }

          await db
            .update(diary)
            .set({ reviewId: linkedReviewId })
            .where(eq(diary.id, newEntry.id));
        }
      }

      // Invalidate taste profile cache so recs reflect new watch
      tasteProfileService.invalidate(user.id).catch(() => {});

      // Track conversion: was this media previously recommended?
      db.update(recommendationFeedback)
        .set({ convertedToWatch: true })
        .where(
          and(
            eq(recommendationFeedback.userId, user.id),
            eq(recommendationFeedback.recType, "media"),
            eq(recommendationFeedback.targetId, body.media_id),
          )
        )
        .catch(() => {});

      return { data: newEntry };
    },
    {
      requireAuth: true,
      body: CreateDiaryEntryBody,
    }
  )

  // Update a diary entry
  .patch(
    "/:id",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [entry] = await db
        .select({ id: diary.id, userId: diary.userId })
        .from(diary)
        .where(eq(diary.id, params.id))
        .limit(1);

      if (!entry) { set.status = 404; return { error: "Entry not found" }; }
      if (entry.userId !== user.id) { set.status = 403; return { error: "Forbidden" }; }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.watched_at !== undefined) updates.watchedAt = body.watched_at;
      if (body.rating !== undefined) updates.rating = body.rating;
      if (body.is_rewatch !== undefined) updates.isRewatch = body.is_rewatch;
      if (body.notes !== undefined) updates.notes = body.notes;

      const [updated] = await db
        .update(diary)
        .set(updates)
        .where(eq(diary.id, params.id))
        .returning();

      tasteProfileService.invalidate(user.id).catch(() => {});

      return { data: updated };
    },
    {
      requireAuth: true,
      params: IdParam,
      body: UpdateDiaryEntryBody,
    }
  )

  // Delete a diary entry
  .delete(
    "/:id",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [entry] = await db
        .select({ id: diary.id, userId: diary.userId })
        .from(diary)
        .where(eq(diary.id, params.id))
        .limit(1);

      if (!entry) { set.status = 404; return { error: "Entry not found" }; }
      if (entry.userId !== user.id) { set.status = 403; return { error: "Forbidden" }; }

      await db.delete(diary).where(eq(diary.id, params.id));

      tasteProfileService.invalidate(user.id).catch(() => {});

      return { success: true };
    },
    {
      requireAuth: true,
      params: IdParam,
    }
  );