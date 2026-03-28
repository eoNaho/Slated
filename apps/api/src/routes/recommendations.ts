/**
 * routes/recommendations.ts
 *
 * Recommendation endpoints.
 *
 *   GET  /recommendations/media               → personalized media recs
 *   GET  /recommendations/users               → user follow suggestions
 *   GET  /recommendations/feed                → ranked intelligent feed
 *   GET  /recommendations/taste-profile       → taste analytics (premium)
 *   POST /recommendations/seed                → invalidate taste cache
 *   POST /recommendations/feedback            → submit rec feedback
 *   GET  /recommendations/explanations        → "because you watched X"
 *   POST /recommendations/onboarding          → cold-start onboarding
 *   GET  /recommendations/onboarding/status   → check onboarding completion
 */

import { Elysia } from "elysia";
import {
  PaginationQuery,
  LimitQuery,
  RecommendationsMediaQuery,
  ExplanationsQuery,
  RecFeedbackBody,
  OnboardingBody,
} from "@pixelreel/validators";
import { betterAuthPlugin } from "../lib/auth";
import {
  mediaRecService,
  userRecService,
  feedService,
  tasteProfileService,
} from "../services/recommendation.service";
import {
  recommendationFeedback,
  recommendationExplanations,
  userOnboardingPreferences,
} from "../db/schema/recommendations";
import { diary } from "../db/schema/content";
import { mediaGenres } from "../db/schema/media";
import {
  db,
  eq,
  and,
  inArray,
  desc,
  count,
} from "../db";
import { storageService } from "../services/storage";
import { logger } from "../utils/logger";

function resolveImageUrl(path: string | null): string | null {
  if (!path) return null;
  return storageService.getImageUrl(path);
}

const FEEDBACK_IMPACT: Record<string, number> = {
  not_interested:  -0.5,
  already_watched:  0,
  loved_it:         1.0,
  not_my_taste:    -1.0,
};

export const recommendationsRoutes = new Elysia({
  prefix: "/recommendations",
  tags: ["Recommendations"],
}).use(betterAuthPlugin)

  // ── GET /recommendations/media ────────────────────────────────────────────

  .get(
    "/media",
    async (ctx: any) => {
      const { user, query } = ctx;
      const isPremium = user.isPremium ?? false;

      const maxLimit = isPremium ? 50 : 10;
      const limit    = Math.min(Number(query.limit) || 20, maxLimit);
      const type     = (query.type ?? "all") as "movie" | "series" | "all";

      const recs = await mediaRecService.getRecommendations(user.id, {
        limit,
        type,
        excludeWatched: query.exclude_watched !== "false",
      });

      return {
        data: recs.map((r) => ({
          ...r,
          id:         r.mediaId,
          posterPath: resolveImageUrl(r.posterPath),
          score:    isPremium ? Math.round(r.score * 10) / 10 : undefined,
          matchPct: isPremium ? Math.min(99, Math.round(r.score * 8)) : undefined,
        })),
        meta: { isPremium, limit, type },
      };
    },
    {
      requireAuth: true,
      query: RecommendationsMediaQuery,
    }
  )

  // ── GET /recommendations/users ────────────────────────────────────────────

  .get(
    "/users",
    async (ctx: any) => {
      const { user, query } = ctx;
      const isPremium = user.isPremium ?? false;

      const maxLimit = isPremium ? 30 : 10;
      const limit    = Math.min(Number(query.limit) || 10, maxLimit);

      const recs = await userRecService.getRecommendations(user.id, limit);

      return {
        data: recs.map((r) => ({
          ...r,
          avatarUrl:       resolveImageUrl(r.avatarUrl),
          tasteSimilarity: isPremium ? Math.round(r.tasteSimilarity * 100) : undefined,
          commonMedia:     isPremium ? r.commonMedia : undefined,
        })),
      };
    },
    {
      requireAuth: true,
      query: LimitQuery,
    }
  )

  // ── GET /recommendations/feed ─────────────────────────────────────────────

  .get(
    "/feed",
    async (ctx: any) => {
      const { user, query } = ctx;
      const page  = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(Number(query.limit) || 20, 50);

      const result = await feedService.getRankedFeed(user.id, { page, limit });

      return {
        data: result.items.map((item) => ({
          ...item,
          avatarUrl:       resolveImageUrl(item.avatarUrl),
          score:           user.isPremium ? item.score : undefined,
          socialProofCount: item.socialProofCount,
        })),
        suggestedUsers: result.suggestedUsers.map((u) => ({
          ...u,
          avatarUrl: resolveImageUrl(u.avatarUrl),
        })),
        pagination: { page, limit, hasMore: result.hasMore },
      };
    },
    {
      requireAuth: true,
      query: PaginationQuery,
    }
  )

  // ── GET /recommendations/taste-profile ────────────────────────────────────

  .get(
    "/taste-profile",
    async (ctx: any) => {
      const { user, set } = ctx;

      if (!user.isPremium) {
        set.status = 403;
        return { error: "Taste profile analytics requires a premium subscription" };
      }

      const profile = await tasteProfileService.buildProfile(user.id);

      return {
        data: {
          topGenres:     profile.topGenres.slice(0, 10),
          topDecades:    profile.topDecades,
          topLanguages:  profile.topLanguages,
          avgRating:     Math.round(profile.avgRating * 10) / 10,
          ratingStdDev:  Math.round(profile.ratingStdDev * 100) / 100,
          totalWatched:  profile.totalWatched,
          reviewRate:    Math.round(profile.reviewRate * 100),
          activityLevel: profile.activityLevel,
          computedAt:    profile.computedAt,
        },
      };
    },
    { requireAuth: true }
  )

  // ── POST /recommendations/seed ────────────────────────────────────────────

  .post(
    "/seed",
    async (ctx: any) => {
      const { user } = ctx;
      await tasteProfileService.invalidate(user.id);
      return { success: true };
    },
    { requireAuth: true }
  )

  // ── POST /recommendations/feedback ────────────────────────────────────────

  .post(
    "/feedback",
    async (ctx: any) => {
      const { user, body } = ctx;
      const impactScore = FEEDBACK_IMPACT[body.feedback] ?? 0;

      try {
        await db
          .insert(recommendationFeedback)
          .values({
            userId:      user.id,
            recType:     body.recType,
            targetId:    body.targetId,
            feedback:    body.feedback,
            impactScore,
            source:      body.source ?? null,
            context:     body.context ?? null,
          })
          .onConflictDoUpdate({
            target: [
              recommendationFeedback.userId,
              recommendationFeedback.recType,
              recommendationFeedback.targetId,
            ],
            set: {
              feedback:    body.feedback,
              impactScore,
              source:      body.source ?? null,
              context:     body.context ?? null,
            },
          });

        // Invalidate rec cache on negative feedback so the item is filtered out
        if (impactScore < 0) {
          await tasteProfileService.invalidate(user.id);
        }
      } catch (err) {
        logger.warn({ err }, "Failed to save recommendation feedback");
      }

      return { success: true };
    },
    {
      requireAuth: true,
      body: RecFeedbackBody,
    }
  )

  // ── GET /recommendations/explanations ─────────────────────────────────────

  .get(
    "/explanations",
    async (ctx: any) => {
      const { user, query } = ctx;

      if (!query.mediaIds) return { data: [] };

      const mediaIds = query.mediaIds
        .split(",")
        .map((id: string) => id.trim())
        .filter(Boolean)
        .slice(0, 50);

      if (mediaIds.length === 0) return { data: [] };

      const rows = await db
        .select()
        .from(recommendationExplanations)
        .where(
          and(
            eq(recommendationExplanations.userId, user.id),
            inArray(recommendationExplanations.targetMediaId, mediaIds)
          )
        )
        .orderBy(desc(recommendationExplanations.createdAt))
        .limit(50);

      return { data: rows };
    },
    {
      requireAuth: true,
      query: ExplanationsQuery,
    }
  )

  // ── POST /recommendations/onboarding ──────────────────────────────────────

  .post(
    "/onboarding",
    async (ctx: any) => {
      const { user, body } = ctx;

      try {
        // Save onboarding preferences
        await db
          .insert(userOnboardingPreferences)
          .values({
            userId:           user.id,
            selectedGenreIds: body.genreIds as any,
            seedMediaIds:     body.seedMediaIds as any,
            completed:        true,
            completedAt:      new Date(),
          })
          .onConflictDoUpdate({
            target: [userOnboardingPreferences.userId],
            set: {
              selectedGenreIds: body.genreIds as any,
              seedMediaIds:     body.seedMediaIds as any,
              completed:        true,
              completedAt:      new Date(),
            },
          });

        // Invalidate profile cache so it gets rebuilt with new data
        await tasteProfileService.invalidate(user.id);

        // Pre-compute initial recommendations (fire-and-forget)
        mediaRecService
          .getRecommendations(user.id, { limit: 20 })
          .catch(() => {});

        return { success: true, hasRecommendations: body.seedMediaIds.length >= 3 };
      } catch (err) {
        logger.error({ err }, "Failed to save onboarding preferences");
        return { success: false };
      }
    },
    {
      requireAuth: true,
      body: OnboardingBody,
    }
  )

  // ── GET /recommendations/onboarding/status ────────────────────────────────

  .get(
    "/onboarding/status",
    async (ctx: any) => {
      const { user } = ctx;

      const [onboarding] = await db
        .select()
        .from(userOnboardingPreferences)
        .where(eq(userOnboardingPreferences.userId, user.id))
        .limit(1);

      if (onboarding?.completed) {
        return { completed: true, hasEnoughData: true };
      }

      // Check if user has enough diary entries to skip onboarding
      const [{ n }] = await db
        .select({ n: count() })
        .from(diary)
        .where(eq(diary.userId, user.id));

      const hasEnoughData = Number(n) >= 5;

      return {
        completed:    !!onboarding?.completed,
        hasEnoughData,
      };
    },
    { requireAuth: true }
  );
