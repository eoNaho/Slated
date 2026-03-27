import { Elysia } from "elysia";
import { db, eq, count, sql } from "../db";
import { betterAuthPlugin } from "../lib/auth";
import {
  recommendationFeedback,
  userOnboardingPreferences,
  userTasteSnapshots,
  userSimilarityCache,
} from "../db/schema/recommendations";

export const adminRecommendationsRoutes = new Elysia({
  prefix: "/admin/recommendations",
  tags: ["Admin"],
})
  .use(betterAuthPlugin)

  // GET /admin/recommendations/metrics
  .get(
    "/metrics",
    async (ctx: any) => {
      const { user, set } = ctx;
      if (user.role !== "admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }

      const [
        feedbackStats,
        onboardingStats,
        profileStats,
        similarityStats,
      ] = await Promise.all([
        // Feedback distribution
        db
          .select({
            feedbackType: recommendationFeedback.feedback,
            total: count(),
          })
          .from(recommendationFeedback)
          .groupBy(recommendationFeedback.feedback),

        // Onboarding stats
        db
          .select({
            completed: userOnboardingPreferences.completed,
            total: count(),
          })
          .from(userOnboardingPreferences)
          .groupBy(userOnboardingPreferences.completed),

        // Taste profile cache size
        db.select({ total: count() }).from(userTasteSnapshots),

        // Similarity matrix size
        db.select({ total: count() }).from(userSimilarityCache),
      ]);

      // Conversion rate: feedback entries that converted to a watch
      const [conversionRow] = await db
        .select({ converted: count() })
        .from(recommendationFeedback)
        .where(eq(recommendationFeedback.convertedToWatch, true));

      const totalFeedback = feedbackStats.reduce((sum, r) => sum + Number(r.total), 0);
      const conversionRate =
        totalFeedback > 0 ? Number(conversionRow.converted) / totalFeedback : 0;

      // Top recommended media (most not_interested signals = frequently shown)
      const topRecommended = await db
        .select({
          targetId: recommendationFeedback.targetId,
          impressions: count(),
        })
        .from(recommendationFeedback)
        .where(eq(recommendationFeedback.recType, "media"))
        .groupBy(recommendationFeedback.targetId)
        .orderBy(sql`count(*) desc`)
        .limit(10);

      const onboardingCompleted = onboardingStats.find((r) => r.completed === true)?.total ?? 0;
      const onboardingTotal = onboardingStats.reduce((s, r) => s + Number(r.total), 0);
      const onboardingCompletionRate =
        onboardingTotal > 0 ? Number(onboardingCompleted) / onboardingTotal : 0;

      return {
        data: {
          feedback: {
            distribution: feedbackStats.map((r) => ({
              type: r.feedbackType,
              count: Number(r.total),
            })),
            total: totalFeedback,
            conversionRate: Math.round(conversionRate * 100) / 100,
          },
          onboarding: {
            completed: Number(onboardingCompleted),
            total: onboardingTotal,
            completionRate: Math.round(onboardingCompletionRate * 100) / 100,
          },
          cache: {
            tasteProfiles: Number(profileStats[0]?.total ?? 0),
            similarityPairs: Number(similarityStats[0]?.total ?? 0),
          },
          topRecommendedMedia: topRecommended.map((r) => ({
            mediaId: r.targetId,
            impressions: Number(r.impressions),
          })),
        },
      };
    },
    { requireAuth: true }
  );
