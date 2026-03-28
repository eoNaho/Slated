import { Elysia } from "elysia";
import {
  PaginationQuery,
  MediaIdParam,
  RateMediaBody,
} from "@pixelreel/validators";
import { db, ratings, media, activities, eq, and, desc, count } from "../db";
import { betterAuthPlugin } from "../lib/auth";
import { storageService } from "../services/storage";
import { tasteProfileService } from "../services/recommendation.service";

// Helper to resolve image URLs
function resolveImageUrl(path: string | null): string | null {
  if (!path) return null;
  return storageService.getImageUrl(path);
}

export const ratingsRoutes = new Elysia({ prefix: "/ratings", tags: ["Social"] })
  .use(betterAuthPlugin)

  // ==========================================================================
  // Get my ratings
  // ==========================================================================

  .get(
    "/",
    async (ctx: any) => {
      const { user, query } = ctx;

      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 100);
      const offset = (page - 1) * limit;

      const results = await db
        .select({
          rating: ratings,
          media: {
            id: media.id,
            title: media.title,
            posterPath: media.posterPath,
            releaseDate: media.releaseDate,
            type: media.type,
            voteAverage: media.voteAverage,
          },
        })
        .from(ratings)
        .innerJoin(media, eq(ratings.mediaId, media.id))
        .where(eq(ratings.userId, user.id))
        .orderBy(desc(ratings.updatedAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(ratings)
        .where(eq(ratings.userId, user.id));

      return {
        data: results.map((r) => ({
          ...r.rating,
          media: {
            ...r.media,
            posterPath: resolveImageUrl(r.media.posterPath),
          },
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
      requireAuth: true,
      query: PaginationQuery,
    }
  )

  // ==========================================================================
  // Get my rating for a specific media
  // ==========================================================================

  .get(
    "/media/:mediaId",
    async (ctx: any) => {
      const { user, params } = ctx;

      const [result] = await db
        .select()
        .from(ratings)
        .where(
          and(eq(ratings.userId, user.id), eq(ratings.mediaId, params.mediaId))
        )
        .limit(1);

      if (!result) {
        return { data: null };
      }

      return { data: result };
    },
    {
      requireAuth: true,
      params: MediaIdParam,
    }
  )

  // ==========================================================================
  // Rate media (create or update)
  // ==========================================================================

  .post(
    "/",
    async (ctx: any) => {
      const { user, body, set } = ctx;

      // Validate rating value
      if (body.rating < 0.5 || body.rating > 5) {
        set.status = 400;
        return { error: "Rating must be between 0.5 and 5" };
      }

      // Check if rating exists (upsert)
      const [existing] = await db
        .select()
        .from(ratings)
        .where(
          and(eq(ratings.userId, user.id), eq(ratings.mediaId, body.mediaId))
        )
        .limit(1);

      let result;

      if (existing) {
        // Update existing rating
        [result] = await db
          .update(ratings)
          .set({
            rating: body.rating,
            updatedAt: new Date(),
          })
          .where(eq(ratings.id, existing.id))
          .returning();
      } else {
        // Create new rating
        [result] = await db
          .insert(ratings)
          .values({
            userId: user.id,
            mediaId: body.mediaId,
            rating: body.rating,
          })
          .returning();

        // Create activity only for new ratings
        await db.insert(activities).values({
          userId: user.id,
          type: "rating",
          targetType: "media",
          targetId: body.mediaId,
          metadata: JSON.stringify({ rating: body.rating }),
        });
      }

      tasteProfileService.invalidate(user.id).catch(() => {});

      return { data: result, isNew: !existing };
    },
    {
      requireAuth: true,
      body: RateMediaBody,
    }
  )

  // ==========================================================================
  // Remove rating
  // ==========================================================================

  .delete(
    "/:mediaId",
    async (ctx: any) => {
      const { user, params } = ctx;

      await db
        .delete(ratings)
        .where(
          and(eq(ratings.userId, user.id), eq(ratings.mediaId, params.mediaId))
        );

      return { success: true, message: "Rating removed" };
    },
    {
      requireAuth: true,
      params: MediaIdParam,
    }
  );
