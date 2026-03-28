/**
 * Smart recommendation notifications.
 * 3 types:
 *  1. Taste-match review: "Your taste match @user just reviewed X"
 *  2. Trending in your top genre: "Trending in your top genre: X"
 *  3. Friends watched: "N people you follow watched X this week"
 */

import {
  db,
  follows,
  diary,
  reviews,
  media,
  mediaGenres,
  user as userTable,
  eq,
  and,
  gte,
  desc,
  count,
  sql,
} from "../db";
import { createNotification } from "../routes/notifications";
import { tasteProfileService } from "./recommendation.service";
import { userSimilarityCache } from "../db/schema/recommendations";
import { logger } from "../utils/logger";

// ─── 1. Taste-match review notification ──────────────────────────────────────

/**
 * When a user posts a review, notify all users who have high similarity with them.
 * Called from reviews.ts after review creation.
 */
export async function notifyTasteMatchReview(
  reviewerId: string,
  mediaId: string,
): Promise<void> {
  try {
    // Get all users who have this reviewer as a high-similarity match (≥ 0.7)
    // userIdB is the "similar user" perspective from userIdA's point of view
    const matches = await db
      .select({ userId: userSimilarityCache.userIdA })
      .from(userSimilarityCache)
      .where(
        and(
          eq(userSimilarityCache.userIdB, reviewerId),
          sql`${userSimilarityCache.similarity} >= 0.7`,
        ),
      )
      .limit(50);

    if (matches.length === 0) return;

    // Fetch reviewer username and media title
    const [reviewer, mediaItem] = await Promise.all([
      db.select({ username: userTable.username, displayName: userTable.displayName })
        .from(userTable).where(eq(userTable.id, reviewerId)).limit(1),
      db.select({ title: media.title, slug: media.slug }).from(media).where(eq(media.id, mediaId)).limit(1),
    ]);

    if (!reviewer[0] || !mediaItem[0]) return;

    const reviewerName = reviewer[0].displayName ?? reviewer[0].username ?? "Someone";
    const mediaTitle = mediaItem[0].title;
    const mediaUrl = `/media/${mediaItem[0].slug}`;

    for (const match of matches) {
      await createNotification(
        match.userId,
        "system",
        "Seu match avaliou um filme",
        `${reviewerName} acabou de avaliar "${mediaTitle}" — alguém com gosto parecido com o seu.`,
        { reviewerId, mediaId, url: mediaUrl },
        reviewerId,
      );
    }

    logger.info({ reviewerId, mediaId, notified: matches.length }, "notifyTasteMatchReview: done");
  } catch (err) {
    logger.warn({ err }, "notifyTasteMatchReview: failed");
  }
}

// ─── 2. Trending in top genre ─────────────────────────────────────────────────

/**
 * Cron job: for each user, if there's a media trending strongly in their top genre
 * and they haven't watched it yet, send one notification.
 * Runs hourly.
 */
export async function notifyTrendingInGenre(): Promise<void> {
  logger.info("notifyTrendingInGenre: starting");

  try {
    // Get top-100 active users (has diary entries in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await db
      .selectDistinct({ userId: diary.userId })
      .from(diary)
      .where(gte(diary.watchedAt, thirtyDaysAgo.toISOString().split("T")[0]))
      .limit(100);

    for (const { userId } of activeUsers) {
      try {
        const profile = await tasteProfileService.buildProfile(userId);
        if (!profile || !profile.topGenres.length) continue;

        const topGenre = profile.topGenres[0];

        // Find trending media in that genre not yet watched by the user
        const watchedIds = [...profile.watchedMediaIds];

        const candidates = await db
          .select({ id: media.id, title: media.title, slug: media.slug })
          .from(media)
          .innerJoin(mediaGenres, eq(mediaGenres.mediaId, media.id))
          .where(
            and(
              eq(mediaGenres.genreId, topGenre.genreId),
              watchedIds.length > 0
                ? sql`${media.id} NOT IN (${sql.join(watchedIds.map(id => sql`${id}::uuid`), sql`, `)})`
                : sql`1=1`,
            ),
          )
          .orderBy(desc(media.popularity))
          .limit(1);

        if (!candidates[0]) continue;

        await createNotification(
          userId,
          "system",
          `Em alta no seu gênero favorito`,
          `"${candidates[0].title}" está em alta em ${topGenre.genreName}.`,
          { mediaId: candidates[0].id, genreId: topGenre.genreId, url: `/media/${candidates[0].slug}` },
        );
      } catch {
        // Skip individual user failures silently
      }
    }

    logger.info({ users: activeUsers.length }, "notifyTrendingInGenre: done");
  } catch (err) {
    logger.warn({ err }, "notifyTrendingInGenre: failed");
  }
}

// ─── 3. Friends watched ───────────────────────────────────────────────────────

/**
 * Cron job: notify users when 3+ people they follow watched the same media this week.
 * Runs hourly. Only sends if user hasn't watched the media yet.
 */
export async function notifyFriendsWatched(): Promise<void> {
  logger.info("notifyFriendsWatched: starting");

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekStr = sevenDaysAgo.toISOString().split("T")[0];

    // Find (follower, media) pairs where 3+ followees watched media this week
    const popularAmongFollowees = await db
      .select({
        followerId: follows.followerId,
        mediaId: diary.mediaId,
        watchCount: count(diary.userId).as("watchCount"),
      })
      .from(follows)
      .innerJoin(diary, and(
        eq(diary.userId, follows.followingId),
        gte(diary.watchedAt, weekStr),
      ))
      .where(eq(follows.status, "accepted"))
      .groupBy(follows.followerId, diary.mediaId)
      .having(sql`count(${diary.userId}) >= 3`)
      .limit(500);

    for (const row of popularAmongFollowees) {
      try {
        // Check user hasn't watched it yet
        const alreadyWatched = await db
          .select({ id: diary.id })
          .from(diary)
          .where(and(eq(diary.userId, row.followerId), eq(diary.mediaId, row.mediaId)))
          .limit(1);

        if (alreadyWatched.length > 0) continue;

        const [mediaItem] = await db
          .select({ title: media.title, slug: media.slug })
          .from(media)
          .where(eq(media.id, row.mediaId))
          .limit(1);

        if (!mediaItem) continue;

        const watchCount = Number(row.watchCount);
        await createNotification(
          row.followerId,
          "system",
          "Populares entre quem você segue",
          `${watchCount} pessoas que você segue assistiram "${mediaItem.title}" essa semana.`,
          { mediaId: row.mediaId, count: watchCount, url: `/media/${mediaItem.slug}` },
        );
      } catch {
        // Skip individual failures
      }
    }

    logger.info({ processed: popularAmongFollowees.length }, "notifyFriendsWatched: done");
  } catch (err) {
    logger.warn({ err }, "notifyFriendsWatched: failed");
  }
}
