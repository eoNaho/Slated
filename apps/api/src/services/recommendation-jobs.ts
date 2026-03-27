/**
 * services/recommendation-jobs.ts
 *
 * Background maintenance jobs for the recommendation system.
 * Registered in services/cron.ts.
 *
 *   precomputeSimilarityMatrix  → recalculate similar user pairs (nightly)
 *   invalidateStaleProfiles     → clean up old profiles (hourly)
 *   warmRecommendationCache     → pre-warm cache for active users (hourly)
 *   precomputeRecommendationBatches → pre-compute rec batches (every 4h)
 */

import {
  db,
  user as userTable,
  diary,
  userStats,
  eq,
  and,
  gte,
  desc,
  count,
  inArray,
  sql,
} from "../db";
import {
  userSimilarityCache,
  userTasteSnapshots,
  recommendationBatches,
} from "../db/schema/recommendations";
import {
  tasteProfileService,
  mediaRecService,
  alignGenreVectors,
  cosineSimilarity,
} from "./recommendation.service";
import { logger } from "../utils/logger";

// ─── Precompute Similarity Matrix ─────────────────────────────────────────────

/**
 * Calculates the top 50 most similar users for each active user.
 * Runs nightly — results cached in DB for 24h.
 *
 * Strategy:
 *  1. For each user, find who watched common films (candidates)
 *  2. Calculate cosine similarity of genre vectors
 *  3. Persist pairs with similarity > 0.3
 */
export async function precomputeSimilarityMatrix(): Promise<void> {
  logger.info("recommendation-jobs: starting similarity matrix precomputation");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const activeUsers = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(
      and(
        eq(userTable.status, "active"),
        gte(userTable.lastActiveAt, thirtyDaysAgo),
      )
    )
    .limit(5000);

  logger.info({ count: activeUsers.length }, "Active users to process");

  let processed = 0;
  let pairs = 0;

  for (const { id: userId } of activeUsers) {
    try {
      const profile = await tasteProfileService.buildProfile(userId);

      if (profile.totalWatched < 5 || profile.genreVector.length === 0) {
        processed++;
        continue;
      }

      // Bug 7 fix: defensive array conversion
      const watchedMediaArr = Array.isArray(profile.watchedMediaIds)
        ? (profile.watchedMediaIds as unknown as string[])
        : [...profile.watchedMediaIds];
      const watchedArray = watchedMediaArr.slice(0, 100);

      if (watchedArray.length === 0) { processed++; continue; }

      const candidates = await db
        .select({ userId: diary.userId, commonCount: count() })
        .from(diary)
        .where(
          and(
            inArray(diary.mediaId, watchedArray),
            sql`${diary.userId} != ${userId}`,
          )
        )
        .groupBy(diary.userId)
        .having(sql`COUNT(*) >= 3`)
        .orderBy(desc(count()))
        .limit(100);

      for (const { userId: candidateId, commonCount } of candidates) {
        const candidateProfile = await tasteProfileService.buildProfile(candidateId);
        if (candidateProfile.genreVector.length === 0) continue;

        // Bug 6 fix: use alignGenreVectors for consistent reference space
        const [vecA, vecB] = alignGenreVectors(profile, candidateProfile);
        const similarity = cosineSimilarity(vecA, vecB);

        if (similarity > 0.3) {
          // Always store with userIdA < userIdB to avoid duplicates
          const [a, b] = userId < candidateId
            ? [userId, candidateId]
            : [candidateId, userId];

          await db
            .insert(userSimilarityCache)
            .values({
              userIdA:    a,
              userIdB:    b,
              similarity,
              commonMedia: Number(commonCount),
              computedAt:  new Date(),
            })
            .onConflictDoUpdate({
              target: [userSimilarityCache.userIdA, userSimilarityCache.userIdB],
              set: {
                similarity,
                commonMedia: Number(commonCount),
                computedAt:  new Date(),
              },
            });
          pairs++;
        }
      }

      processed++;
      if (processed % 100 === 0) {
        logger.info(
          { processed, total: activeUsers.length, pairs },
          "Similarity matrix progress"
        );
      }
    } catch (err) {
      logger.warn({ err, userId }, "Failed to process user in similarity matrix");
      processed++;
    }
  }

  logger.info({ processed, pairs }, "recommendation-jobs: similarity matrix done");
}

// ─── Invalidate Stale Profiles ────────────────────────────────────────────────

/**
 * Removes taste snapshots older than 24h.
 * They will be recomputed on-demand on next request.
 */
export async function invalidateStaleProfiles(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await db
    .delete(userTasteSnapshots)
    .where(sql`${userTasteSnapshots.updatedAt} < ${cutoff}`)
    .returning({ userId: userTasteSnapshots.userId });

  logger.info(
    { count: result.length },
    "recommendation-jobs: stale profiles invalidated"
  );
}

// ─── Warm Cache for Active Users ──────────────────────────────────────────────

/**
 * Pre-builds taste profiles and recs for the top 100 users by XP.
 * Reduces latency on their first request.
 */
export async function warmRecommendationCache(): Promise<void> {
  const topUsers = await db
    .select({ userId: userStats.userId })
    .from(userStats)
    .orderBy(desc(userStats.xp))
    .limit(100);

  let warmed = 0;
  for (const { userId } of topUsers) {
    try {
      await tasteProfileService.buildProfile(userId);
      warmed++;
    } catch {
      // Skip failed
    }
  }

  logger.info({ warmed }, "recommendation-jobs: cache warmed");
}

// ─── Precompute Recommendation Batches ───────────────────────────────────────

/**
 * Pre-computes media recommendation batches for the top 200 active users.
 * Stored in recommendation_batches table with a 4h expiry.
 * This avoids real-time computation on page load.
 */
export async function precomputeRecommendationBatches(): Promise<void> {
  logger.info("recommendation-jobs: starting batch precomputation");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const activeUsers = await db
    .select({ id: userTable.id })
    .from(userTable)
    .innerJoin(userStats, eq(userTable.id, userStats.userId))
    .where(
      and(
        eq(userTable.status, "active"),
        gte(userTable.lastActiveAt, thirtyDaysAgo),
      )
    )
    .orderBy(desc(userStats.xp))
    .limit(200);

  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
  let computed = 0;

  // Process in batches of 10 to avoid overwhelming the DB
  const userIds = activeUsers.map((u) => u.id);
  for (let i = 0; i < userIds.length; i += 10) {
    const batch = userIds.slice(i, i + 10);
    await Promise.all(
      batch.map(async (userId) => {
        try {
          const recs = await mediaRecService.getRecommendations(userId, {
            limit: 20,
            type: "all",
            excludeWatched: true,
          });

          await db
            .insert(recommendationBatches)
            .values({
              userId,
              batchType: "media",
              items: recs as any,
              parameters: { limit: 20, type: "all" },
              expiresAt,
            })
            .onConflictDoNothing();

          computed++;
        } catch (err) {
          logger.warn({ err, userId }, "Failed to precompute batch");
        }
      })
    );
  }

  logger.info({ computed }, "recommendation-jobs: batch precomputation done");
}
