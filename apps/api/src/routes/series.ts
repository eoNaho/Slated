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
  count,
  inArray,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";
import { tmdbService } from "../services/tmdb";
import { storageService } from "../services/storage";
import { logger } from "../utils/logger";

// Helper to resolve image URLs
function resolveImageUrl(path: string | null): string | null {
  if (!path) return null;
  return storageService.getImageUrl(path);
}

export const seriesRoutes = new Elysia({ prefix: "/series", tags: ["Media"] })
  .use(betterAuthPlugin)

  // ==========================================================================
  // Get series seasons
  // ==========================================================================

  .get(
    "/:id/seasons",
    async ({ params, set }: any) => {
      const [item] = await db
        .select()
        .from(media)
        .where(eq(media.id, params.id))
        .limit(1);

      if (!item) {
        set.status = 404;
        return { error: "Media not found" };
      }

      if (item.type !== "series") {
        set.status = 400;
        return { error: "Not a series" };
      }

      let seriesSeasons = await db
        .select()
        .from(seasons)
        .where(eq(seasons.mediaId, params.id))
        .orderBy(asc(seasons.seasonNumber));

      if (seriesSeasons.length === 0 && item.tmdbId) {
        try {
          await syncSeasonsFromTMDB(params.id, item.tmdbId);
          seriesSeasons = await db
            .select()
            .from(seasons)
            .where(eq(seasons.mediaId, params.id))
            .orderBy(asc(seasons.seasonNumber));
        } catch (e) {
          logger.error({ error: e }, "Failed to sync seasons");
        }
      }

      return {
        data: seriesSeasons.map((s) => ({
          ...s,
          posterPath: resolveImageUrl(s.posterPath),
        })),
      };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ==========================================================================
  // Get season episodes (optional auth for progress)
  // ==========================================================================

  .get(
    "/:id/seasons/:seasonNumber",
    async (ctx: any) => {
      const { params, set, request } = ctx;

      const [item] = await db
        .select()
        .from(media)
        .where(eq(media.id, params.id))
        .limit(1);

      if (!item || item.type !== "series") {
        set.status = 404;
        return { error: "Series not found" };
      }

      let [season] = await db
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
        if (item.tmdbId) {
          try {
            await syncSeasonsFromTMDB(params.id, item.tmdbId);
          } catch (e) {
            logger.error({ error: e }, "Failed to sync seasons");
          }
        }

        const [fetched] = await db
          .select()
          .from(seasons)
          .where(
            and(
              eq(seasons.mediaId, params.id),
              eq(seasons.seasonNumber, Number(params.seasonNumber))
            )
          )
          .limit(1);

        if (!fetched) {
          set.status = 404;
          return { error: "Season not found" };
        }
        season = fetched;
      }

      let seasonEpisodes = await db
        .select()
        .from(episodes)
        .where(eq(episodes.seasonId, season.id))
        .orderBy(asc(episodes.episodeNumber));

      if (seasonEpisodes.length === 0 && item.tmdbId) {
        try {
          await syncEpisodesFromTMDB(season.id, item.tmdbId, Number(params.seasonNumber));
          seasonEpisodes = await db
            .select()
            .from(episodes)
            .where(eq(episodes.seasonId, season.id))
            .orderBy(asc(episodes.episodeNumber));
        } catch (e) {
          logger.error({ error: e }, "Failed to sync episodes");
        }
      }

      // Optional auth — show progress if user is logged in
      let progress: Record<string, boolean> = {};
      const sessionUser = ctx.user;
      if (sessionUser && seasonEpisodes.length > 0) {
        const watched = await db
          .select({ episodeId: episodeProgress.episodeId })
          .from(episodeProgress)
          .where(eq(episodeProgress.userId, sessionUser.id));

        progress = watched.reduce(
          (acc, w) => { acc[w.episodeId] = true; return acc; },
          {} as Record<string, boolean>
        );
      }

      return {
        data: {
          season: { ...season, posterPath: resolveImageUrl(season.posterPath) },
          episodes: seasonEpisodes.map((e) => ({
            ...e,
            stillPath: resolveImageUrl(e.stillPath),
            watched: progress[e.id] || false,
          })),
        },
      };
    },
    {
      params: t.Object({ id: t.String(), seasonNumber: t.String() }),
    }
  )

  // ==========================================================================
  // Mark episode as watched
  // ==========================================================================

  .post(
    "/:id/episodes/:episodeId/watch",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [episode] = await db
        .select()
        .from(episodes)
        .where(eq(episodes.id, params.episodeId))
        .limit(1);

      if (!episode) {
        set.status = 404;
        return { error: "Episode not found" };
      }

      try {
        const [result] = await db
          .insert(episodeProgress)
          .values({
            userId: user.id,
            episodeId: params.episodeId,
            rating: body?.rating,
            notes: body?.notes,
          })
          .onConflictDoUpdate({
            target: [episodeProgress.userId, episodeProgress.episodeId],
            set: {
              watchedAt: new Date(),
              rating: body?.rating,
              notes: body?.notes,
            },
          })
          .returning();

        await db.insert(activities).values({
          userId: user.id,
          type: "watched_episode",
          targetType: "episode",
          targetId: params.episodeId,
          metadata: JSON.stringify({
            episodeName: episode.name,
            episodeNumber: episode.episodeNumber,
          }),
        });

        return { data: result };
      } catch (e: any) {
        logger.error({ error: e }, "Failed to mark episode as watched");
        throw e;
      }
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), episodeId: t.String() }),
      body: t.Optional(
        t.Object({
          rating: t.Optional(t.Number({ minimum: 0.5, maximum: 5 })),
          notes: t.Optional(t.String()),
        })
      ),
    }
  )

  // ==========================================================================
  // Unwatch episode
  // ==========================================================================

  .delete(
    "/:id/episodes/:episodeId/watch",
    async (ctx: any) => {
      const { user, params } = ctx;

      await db
        .delete(episodeProgress)
        .where(
          and(
            eq(episodeProgress.userId, user.id),
            eq(episodeProgress.episodeId, params.episodeId)
          )
        );

      return { success: true, message: "Episode unmarked" };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), episodeId: t.String() }),
    }
  )

  // ==========================================================================
  // Get series progress
  // ==========================================================================

  .get(
    "/:id/progress",
    async (ctx: any) => {
      const { user, params } = ctx;

      const seriesSeasons = await db
        .select()
        .from(seasons)
        .where(eq(seasons.mediaId, params.id))
        .orderBy(asc(seasons.seasonNumber));

      const progress = await Promise.all(
        seriesSeasons.map(async (season) => {
          const seasonEpisodes = await db
            .select()
            .from(episodes)
            .where(eq(episodes.seasonId, season.id));

          const episodeIds = seasonEpisodes.map((e) => e.id);

          const [watchedCount] = await db
            .select({ count: count() })
            .from(episodeProgress)
            .where(
              and(
                eq(episodeProgress.userId, user.id),
                episodeIds.length > 0
                  ? inArray(episodeProgress.episodeId, episodeIds)
                  : eq(episodeProgress.episodeId, "")
              )
            );

          return {
            seasonNumber: season.seasonNumber,
            totalEpisodes: seasonEpisodes.length,
            watchedEpisodes: watchedCount?.count || 0,
            percentage:
              seasonEpisodes.length > 0
                ? Math.round(((watchedCount?.count || 0) / seasonEpisodes.length) * 100)
                : 0,
          };
        })
      );

      const totalEpisodes = progress.reduce((acc, s) => acc + s.totalEpisodes, 0);
      const totalWatched = progress.reduce((acc, s) => acc + s.watchedEpisodes, 0);

      return {
        data: {
          mediaId: params.id,
          totalEpisodes,
          watchedEpisodes: totalWatched,
          percentage: totalEpisodes > 0 ? Math.round((totalWatched / totalEpisodes) * 100) : 0,
          bySeasons: progress,
        },
      };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  );

// ==========================================================================
// Helper: Sync seasons from TMDB (via service)
// ==========================================================================

async function syncSeasonsFromTMDB(mediaId: string, tmdbId: number) {
  const data = await tmdbService.getSeriesDetails(tmdbId);

  if (data.seasons) {
    for (const s of data.seasons) {
      await db
        .insert(seasons)
        .values({
          mediaId,
          tmdbId: s.id,
          seasonNumber: s.season_number,
          name: s.name,
          overview: s.overview,
          posterPath: s.poster_path ? `tmdb:${s.poster_path}` : null,
          airDate: s.air_date,
          episodeCount: s.episode_count,
        })
        .onConflictDoNothing();
    }
  }
}

// ==========================================================================
// Helper: Sync episodes from TMDB (via service)
// ==========================================================================

async function syncEpisodesFromTMDB(
  seasonId: string,
  tmdbId: number,
  seasonNumber: number
) {
  const data = await tmdbService.getSeasonDetails(tmdbId, seasonNumber);

  if (data.episodes) {
    for (const e of data.episodes) {
      await db
        .insert(episodes)
        .values({
          seasonId,
          tmdbId: e.id,
          episodeNumber: e.episode_number,
          name: e.name,
          overview: e.overview,
          stillPath: e.still_path ? `tmdb:${e.still_path}` : null,
          airDate: e.air_date,
          runtime: e.runtime,
          voteAverage: e.vote_average,
          voteCount: e.vote_count,
        })
        .onConflictDoNothing();
    }
  }
}
