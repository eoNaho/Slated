/**
 * routes/series.ts
 *
 * Full series tracking system:
 *   - Season & episode browsing (auto-sync from TMDB on first access)
 *   - Episode watched/unwatched with optional rating
 *   - Season-level ratings (manual or auto-calculated from episodes)
 *   - Series progress (per user)
 *   - On-demand image upload for episode stills
 */

import { Elysia, t } from "elysia";
import {
  db,
  media,
  seasons,
  episodes,
  episodeProgress,
  activities,
  eq,
  and,
  asc,
  desc,
  count,
  inArray,
  sql,
} from "../db";
import { seasonRatings } from "../db/schema/series";
import { ratings } from "../db/schema/ratings";
import { betterAuthPlugin, getOptionalSession } from "../lib/auth";
import { storageService } from "../services/storage";
import {
  syncSeriesSeasons,
  syncSeasonEpisodes,
  uploadSeasonStills,
  deepSyncSeries,
} from "../services/tmdb-series";
import { logger } from "../utils/logger";

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return storageService.getImageUrl(path);
}

/**
 * Ensure seasons exist for a series. If not yet synced, triggers sync
 * and returns the freshly synced seasons.
 */
async function ensureSeasonsSynced(mediaId: string, tmdbId: number, slug: string) {
  const existing = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(eq(seasons.mediaId, mediaId))
    .limit(1);

  if (existing.length === 0) {
    // Fire-and-forget the deep sync (episodes included)
    // Return after seasons are done so the response isn't too slow
    await syncSeriesSeasons(mediaId, tmdbId, slug);

    // Kick off episode sync in background
    db.select({ id: seasons.id, seasonNumber: seasons.seasonNumber })
      .from(seasons)
      .where(eq(seasons.mediaId, mediaId))
      .then(async (sRows) => {
        for (const s of sRows) {
          await syncSeasonEpisodes(s.id, tmdbId, s.seasonNumber);
        }
      })
      .catch((err) => logger.error({ err }, "Background episode sync failed"));
  }
}

/**
 * Ensure episodes exist for a season. Syncs on first access.
 */
async function ensureEpisodesSynced(
  seasonId: string,
  tmdbId: number,
  seasonNumber: number
): Promise<void> {
  const [existing] = await db
    .select({ id: episodes.id })
    .from(episodes)
    .where(eq(episodes.seasonId, seasonId))
    .limit(1);

  if (!existing) {
    await syncSeasonEpisodes(seasonId, tmdbId, seasonNumber);
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────

export const seriesRoutes = new Elysia({ prefix: "/series", tags: ["Series"] })
  .use(betterAuthPlugin)

  // ══════════════════════════════════════════════════════════════════════════
  //  SEASONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /series/:id/seasons
   * List all seasons for a series. Triggers sync on first access.
   */
  .get(
    "/:id/seasons",
    async (ctx: any) => {
      const { params, request, set } = ctx;

      const [item] = await db
        .select({ id: media.id, tmdbId: media.tmdbId, type: media.type, slug: media.slug })
        .from(media)
        .where(eq(media.id, params.id))
        .limit(1);

      if (!item) { set.status = 404; return { error: "Media not found" }; }
      if (item.type !== "series") { set.status = 400; return { error: "Not a series" }; }

      await ensureSeasonsSynced(item.id, item.tmdbId, item.slug);

      const seriesSeasons = await db
        .select()
        .from(seasons)
        .where(eq(seasons.mediaId, params.id))
        .orderBy(asc(seasons.seasonNumber));

      // Attach user's season rating if authenticated
      const session = await getOptionalSession(request.headers);
      let ratingMap: Record<string, number> = {};
      if (session?.user && seriesSeasons.length > 0) {
        const seasonIds = seriesSeasons.map((s) => s.id);
        const userRatings = await db
          .select({ seasonId: seasonRatings.seasonId, rating: seasonRatings.rating })
          .from(seasonRatings)
          .where(
            and(
              eq(seasonRatings.userId, session.user.id),
              inArray(seasonRatings.seasonId, seasonIds)
            )
          );
        ratingMap = Object.fromEntries(userRatings.map((r) => [r.seasonId, r.rating]));
      }

      return {
        data: seriesSeasons.map((s) => ({
          ...s,
          posterPath: resolveImageUrl(s.posterPath),
          myRating: ratingMap[s.id] ?? null,
        })),
      };
    },
    { params: t.Object({ id: t.String() }) }
  )

  /**
   * GET /series/:id/seasons/:seasonNumber
   * Season detail with all episodes. Triggers sync on first access.
   * Attaches watched status per episode if user is authenticated.
   */
  .get(
    "/:id/seasons/:seasonNumber",
    async (ctx: any) => {
      const { params, request, set } = ctx;

      const [item] = await db
        .select({ id: media.id, tmdbId: media.tmdbId, type: media.type, slug: media.slug })
        .from(media)
        .where(eq(media.id, params.id))
        .limit(1);

      if (!item || item.type !== "series") {
        set.status = 404;
        return { error: "Series not found" };
      }

      await ensureSeasonsSynced(item.id, item.tmdbId, item.slug);

      const [season] = await db
        .select()
        .from(seasons)
        .where(
          and(
            eq(seasons.mediaId, params.id),
            eq(seasons.seasonNumber, Number(params.seasonNumber))
          )
        )
        .limit(1);

      if (!season) {
        set.status = 404;
        return { error: "Season not found" };
      }

      await ensureEpisodesSynced(season.id, item.tmdbId, season.seasonNumber);

      const seasonEpisodes = await db
        .select()
        .from(episodes)
        .where(eq(episodes.seasonId, season.id))
        .orderBy(asc(episodes.episodeNumber));

      // Trigger background still upload if many are still TMDB CDN
      const tmdbStillCount = seasonEpisodes.filter(
        (e) => e.stillPath?.startsWith("tmdb:")
      ).length;
      if (tmdbStillCount > 0 && storageService.isConfigured()) {
        uploadSeasonStills(season.id, item.slug, season.seasonNumber).catch(() => {});
      }

      // User episode progress + season rating
      const session = await getOptionalSession(request.headers);
      let watchedIds = new Set<string>();
      let episodeRatingMap: Record<string, number> = {};
      let mySeasonRating: number | null = null;

      if (session?.user) {
        const episodeIds = seasonEpisodes.map((e) => e.id);

        if (episodeIds.length > 0) {
          const progress = await db
            .select({ episodeId: episodeProgress.episodeId, rating: episodeProgress.rating })
            .from(episodeProgress)
            .where(
              and(
                eq(episodeProgress.userId, session.user.id),
                inArray(episodeProgress.episodeId, episodeIds)
              )
            );
          watchedIds = new Set(progress.map((p) => p.episodeId));
          episodeRatingMap = Object.fromEntries(
            progress
              .filter((p) => p.rating != null)
              .map((p) => [p.episodeId, p.rating!])
          );
        }

        const [sr] = await db
          .select({ rating: seasonRatings.rating })
          .from(seasonRatings)
          .where(
            and(
              eq(seasonRatings.userId, session.user.id),
              eq(seasonRatings.seasonId, season.id)
            )
          )
          .limit(1);
        mySeasonRating = sr?.rating ?? null;
      }

      return {
        data: {
          season: {
            ...season,
            posterPath: resolveImageUrl(season.posterPath),
            myRating: mySeasonRating,
          },
          episodes: seasonEpisodes.map((e) => ({
            ...e,
            stillPath: resolveImageUrl(e.stillPath),
            watched:      watchedIds.has(e.id),
            myRating:     episodeRatingMap[e.id] ?? null,
          })),
          progress: {
            watched: watchedIds.size,
            total:   seasonEpisodes.length,
            percent: seasonEpisodes.length > 0
              ? Math.round((watchedIds.size / seasonEpisodes.length) * 100)
              : 0,
          },
        },
      };
    },
    { params: t.Object({ id: t.String(), seasonNumber: t.String() }) }
  )

  /**
   * GET /series/:id/seasons/:seasonNumber/episodes/:episodeNumber
   * Single episode detail.
   */
  .get(
    "/:id/seasons/:seasonNumber/episodes/:episodeNumber",
    async (ctx: any) => {
      const { params, request, set } = ctx;

      const [item] = await db
        .select({ id: media.id, type: media.type })
        .from(media)
        .where(eq(media.id, params.id))
        .limit(1);

      if (!item || item.type !== "series") {
        set.status = 404;
        return { error: "Series not found" };
      }

      const [season] = await db
        .select({ id: seasons.id })
        .from(seasons)
        .where(
          and(
            eq(seasons.mediaId, params.id),
            eq(seasons.seasonNumber, Number(params.seasonNumber))
          )
        )
        .limit(1);

      if (!season) { set.status = 404; return { error: "Season not found" }; }

      const [episode] = await db
        .select()
        .from(episodes)
        .where(
          and(
            eq(episodes.seasonId, season.id),
            eq(episodes.episodeNumber, Number(params.episodeNumber))
          )
        )
        .limit(1);

      if (!episode) { set.status = 404; return { error: "Episode not found" }; }

      const session = await getOptionalSession(request.headers);
      let myProgress: typeof episodeProgress.$inferSelect | null = null;

      if (session?.user) {
        const [p] = await db
          .select()
          .from(episodeProgress)
          .where(
            and(
              eq(episodeProgress.userId, session.user.id),
              eq(episodeProgress.episodeId, episode.id)
            )
          )
          .limit(1);
        myProgress = p ?? null;
      }

      return {
        data: {
          ...episode,
          stillPath: resolveImageUrl(episode.stillPath),
          watched:  !!myProgress,
          myRating: myProgress?.rating ?? null,
          watchedAt: myProgress?.watchedAt ?? null,
        },
      };
    },
    { params: t.Object({ id: t.String(), seasonNumber: t.String(), episodeNumber: t.String() }) }
  )

  // ══════════════════════════════════════════════════════════════════════════
  //  SYNC (admin / on-demand)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /series/:id/sync
   * Full deep sync: seasons + episodes + images.
   * Useful after TMDB data changes or for admin backfills.
   */
  .post(
    "/:id/sync",
    async (ctx: any) => {
      const { params, set } = ctx;

      const [item] = await db
        .select({ id: media.id, tmdbId: media.tmdbId, type: media.type, slug: media.slug })
        .from(media)
        .where(eq(media.id, params.id))
        .limit(1);

      if (!item) { set.status = 404; return { error: "Media not found" }; }
      if (item.type !== "series") { set.status = 400; return { error: "Not a series" }; }

      // Run in background — return immediately
      deepSyncSeries(item.id, item.tmdbId, item.slug).catch((err) =>
        logger.error({ err, mediaId: item.id }, "Deep sync failed")
      );

      return { success: true, message: "Sync started in background" };
    },
    { requireAuth: true, params: t.Object({ id: t.String() }) }
  )

  /**
   * POST /series/:id/seasons/:seasonNumber/sync-stills
   * Upload all episode stills for a season to B2.
   */
  .post(
    "/:id/seasons/:seasonNumber/sync-stills",
    async (ctx: any) => {
      const { params, set } = ctx;

      const [item] = await db
        .select({ id: media.id, slug: media.slug, type: media.type })
        .from(media)
        .where(eq(media.id, params.id))
        .limit(1);

      if (!item || item.type !== "series") {
        set.status = 404;
        return { error: "Series not found" };
      }

      const [season] = await db
        .select({ id: seasons.id })
        .from(seasons)
        .where(
          and(
            eq(seasons.mediaId, params.id),
            eq(seasons.seasonNumber, Number(params.seasonNumber))
          )
        )
        .limit(1);

      if (!season) { set.status = 404; return { error: "Season not found" }; }

      const result = await uploadSeasonStills(
        season.id,
        item.slug,
        Number(params.seasonNumber)
      );

      return { success: true, ...result };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), seasonNumber: t.String() }),
    }
  )

  // ══════════════════════════════════════════════════════════════════════════
  //  EPISODE TRACKING
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /series/:id/episodes/:episodeId/watch
   * Mark episode as watched. Optional rating (0.5–5).
   * After marking, recalculates season average rating if user has no manual season rating.
   */
  .post(
    "/:id/episodes/:episodeId/watch",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [episode] = await db
        .select({ id: episodes.id, seasonId: episodes.seasonId, name: episodes.name, episodeNumber: episodes.episodeNumber })
        .from(episodes)
        .where(eq(episodes.id, params.episodeId))
        .limit(1);

      if (!episode) { set.status = 404; return { error: "Episode not found" }; }

      const [result] = await db
        .insert(episodeProgress)
        .values({
          userId:    user.id,
          episodeId: params.episodeId,
          rating:    body?.rating ?? null,
          notes:     body?.notes ?? null,
        })
        .onConflictDoUpdate({
          target: [episodeProgress.userId, episodeProgress.episodeId],
          set: {
            watchedAt: new Date(),
            rating: body?.rating ?? null,
            notes:  body?.notes ?? null,
          },
        })
        .returning();

      // Recalculate season auto-rating if user has no manual override
      await maybeRecalcSeasonRating(user.id, episode.seasonId);

      // Activity log
      await db.insert(activities).values({
        userId:     user.id,
        type:       "watched_episode",
        targetType: "episode",
        targetId:   params.episodeId,
        metadata:   JSON.stringify({
          episodeName:   episode.name,
          episodeNumber: episode.episodeNumber,
          seriesId:      params.id,
        }),
      });

      return { data: result };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), episodeId: t.String() }),
      body: t.Optional(
        t.Object({
          rating: t.Optional(t.Number({ minimum: 0.5, maximum: 5 })),
          notes:  t.Optional(t.String({ maxLength: 500 })),
        })
      ),
    }
  )

  /**
   * DELETE /series/:id/episodes/:episodeId/watch
   * Unmark episode as watched.
   */
  .delete(
    "/:id/episodes/:episodeId/watch",
    async (ctx: any) => {
      const { user, params } = ctx;

      const [episode] = await db
        .select({ seasonId: episodes.seasonId })
        .from(episodes)
        .where(eq(episodes.id, params.episodeId))
        .limit(1);

      await db
        .delete(episodeProgress)
        .where(
          and(
            eq(episodeProgress.userId, user.id),
            eq(episodeProgress.episodeId, params.episodeId)
          )
        );

      if (episode) {
        await maybeRecalcSeasonRating(user.id, episode.seasonId);
      }

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), episodeId: t.String() }),
    }
  )

  /**
   * POST /series/:id/seasons/:seasonNumber/watch-all
   * Mark all episodes in a season as watched in one call.
   * Useful for "I already watched this" bulk action.
   */
  .post(
    "/:id/seasons/:seasonNumber/watch-all",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [season] = await db
        .select({ id: seasons.id })
        .from(seasons)
        .where(
          and(
            eq(seasons.mediaId, params.id),
            eq(seasons.seasonNumber, Number(params.seasonNumber))
          )
        )
        .limit(1);

      if (!season) { set.status = 404; return { error: "Season not found" }; }

      const seasonEpisodes = await db
        .select({ id: episodes.id })
        .from(episodes)
        .where(eq(episodes.seasonId, season.id));

      if (seasonEpisodes.length === 0) {
        return { success: true, marked: 0 };
      }

      const values = seasonEpisodes.map((e) => ({
        userId:    user.id,
        episodeId: e.id,
      }));

      await db
        .insert(episodeProgress)
        .values(values)
        .onConflictDoNothing();

      await maybeRecalcSeasonRating(user.id, season.id);

      return { success: true, marked: seasonEpisodes.length };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), seasonNumber: t.String() }),
    }
  )

  // ══════════════════════════════════════════════════════════════════════════
  //  RATINGS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /series/:id/seasons/:seasonNumber/rate
   * Rate a season (0.5–5). Creates a manual rating.
   */
  .post(
    "/:id/seasons/:seasonNumber/rate",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [season] = await db
        .select({ id: seasons.id })
        .from(seasons)
        .where(
          and(
            eq(seasons.mediaId, params.id),
            eq(seasons.seasonNumber, Number(params.seasonNumber))
          )
        )
        .limit(1);

      if (!season) { set.status = 404; return { error: "Season not found" }; }

      const [result] = await db
        .insert(seasonRatings)
        .values({
          userId:   user.id,
          seasonId: season.id,
          rating:   body.rating,
          isManual: "manual",
        })
        .onConflictDoUpdate({
          target: [seasonRatings.userId, seasonRatings.seasonId],
          set: {
            rating:   body.rating,
            isManual: "manual",
            updatedAt: new Date(),
          },
        })
        .returning();

      return { data: result };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), seasonNumber: t.String() }),
      body: t.Object({ rating: t.Number({ minimum: 0.5, maximum: 5 }) }),
    }
  )

  /**
   * DELETE /series/:id/seasons/:seasonNumber/rate
   * Remove a season rating (reverts to auto-calculated if episodes rated).
   */
  .delete(
    "/:id/seasons/:seasonNumber/rate",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [season] = await db
        .select({ id: seasons.id })
        .from(seasons)
        .where(
          and(
            eq(seasons.mediaId, params.id),
            eq(seasons.seasonNumber, Number(params.seasonNumber))
          )
        )
        .limit(1);

      if (!season) { set.status = 404; return { error: "Season not found" }; }

      await db
        .delete(seasonRatings)
        .where(
          and(
            eq(seasonRatings.userId, user.id),
            eq(seasonRatings.seasonId, season.id)
          )
        );

      // Try to auto-calculate from episodes
      await maybeRecalcSeasonRating(user.id, season.id);

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), seasonNumber: t.String() }),
    }
  )

  // ══════════════════════════════════════════════════════════════════════════
  //  PROGRESS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /series/:id/progress
   * User's full progress for this series.
   * Returns per-season breakdown + overall percentage.
   */
  .get(
    "/:id/progress",
    async (ctx: any) => {
      const { user, params } = ctx;

      const seriesSeasons = await db
        .select({ id: seasons.id, seasonNumber: seasons.seasonNumber, name: seasons.name, episodeCount: seasons.episodeCount })
        .from(seasons)
        .where(eq(seasons.mediaId, params.id))
        .orderBy(asc(seasons.seasonNumber));

      if (seriesSeasons.length === 0) {
        return { data: { seasons: [], totalEpisodes: 0, watchedEpisodes: 0, percent: 0 } };
      }

      const seasonIds = seriesSeasons.map((s) => s.id);

      // All episodes for this series
      const allEpisodes = await db
        .select({ id: episodes.id, seasonId: episodes.seasonId })
        .from(episodes)
        .where(inArray(episodes.seasonId, seasonIds));

      const episodeIds = allEpisodes.map((e) => e.id);

      // User's watched episodes
      const watched = episodeIds.length > 0
        ? await db
            .select({ episodeId: episodeProgress.episodeId })
            .from(episodeProgress)
            .where(
              and(
                eq(episodeProgress.userId, user.id),
                inArray(episodeProgress.episodeId, episodeIds)
              )
            )
        : [];

      const watchedSet = new Set(watched.map((w) => w.episodeId));

      // User's season ratings
      const userSeasonRatings = await db
        .select({ seasonId: seasonRatings.seasonId, rating: seasonRatings.rating, isManual: seasonRatings.isManual })
        .from(seasonRatings)
        .where(
          and(
            eq(seasonRatings.userId, user.id),
            inArray(seasonRatings.seasonId, seasonIds)
          )
        );
      const ratingMap = Object.fromEntries(
        userSeasonRatings.map((r) => [r.seasonId, { rating: r.rating, isManual: r.isManual }])
      );

      // Build season breakdown
      const seasonBreakdown = seriesSeasons.map((s) => {
        const seasonEps = allEpisodes.filter((e) => e.seasonId === s.id);
        const watchedCount = seasonEps.filter((e) => watchedSet.has(e.id)).length;
        const sr = ratingMap[s.id];
        return {
          seasonId:      s.id,
          seasonNumber:  s.seasonNumber,
          name:          s.name,
          totalEpisodes: seasonEps.length,
          watchedEpisodes: watchedCount,
          percent: seasonEps.length > 0 ? Math.round((watchedCount / seasonEps.length) * 100) : 0,
          rating:    sr?.rating ?? null,
          ratingSource: sr?.isManual ?? null,
        };
      });

      const totalEpisodes   = allEpisodes.length;
      const watchedEpisodes = watched.length;

      return {
        data: {
          seasons: seasonBreakdown,
          totalEpisodes,
          watchedEpisodes,
          percent: totalEpisodes > 0 ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0,
        },
      };
    },
    { requireAuth: true, params: t.Object({ id: t.String() }) }
  );

// ── Internal helpers ───────────────────────────────────────────────────────

/**
 * After any watched/rating change, recalculate the auto season rating
 * ONLY if the user has no manual season rating.
 */
async function maybeRecalcSeasonRating(userId: string, seasonId: string): Promise<void> {
  // Check for manual override
  const [manual] = await db
    .select({ isManual: seasonRatings.isManual })
    .from(seasonRatings)
    .where(
      and(
        eq(seasonRatings.userId, userId),
        eq(seasonRatings.seasonId, seasonId)
      )
    )
    .limit(1);

  if (manual?.isManual === "manual") return; // Don't touch manual ratings

  // Get all episode IDs for this season
  const seasonEps = await db
    .select({ id: episodes.id })
    .from(episodes)
    .where(eq(episodes.seasonId, seasonId));

  if (seasonEps.length === 0) return;

  const episodeIds = seasonEps.map((e) => e.id);

  // Average of rated watched episodes
  const [avg] = await db
    .select({
      avgRating: sql<number>`AVG(${episodeProgress.rating})`,
      ratedCount: sql<number>`COUNT(${episodeProgress.rating})`,
    })
    .from(episodeProgress)
    .where(
      and(
        eq(episodeProgress.userId, userId),
        inArray(episodeProgress.episodeId, episodeIds),
        sql`${episodeProgress.rating} IS NOT NULL`
      )
    );

  if (!avg || avg.ratedCount < 1) {
    // No rated episodes — remove auto rating if it exists
    await db
      .delete(seasonRatings)
      .where(
        and(
          eq(seasonRatings.userId, userId),
          eq(seasonRatings.seasonId, seasonId)
        )
      );
    return;
  }

  const calculated = Math.round(avg.avgRating * 2) / 2; // Round to nearest 0.5

  await db
    .insert(seasonRatings)
    .values({
      userId,
      seasonId,
      rating:   calculated,
      isManual: "auto",
    })
    .onConflictDoUpdate({
      target: [seasonRatings.userId, seasonRatings.seasonId],
      set: {
        rating:   calculated,
        isManual: "auto",
        updatedAt: new Date(),
      },
    });
}
