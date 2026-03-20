/**
 * services/tmdb-series.ts
 *
 * Handles the "deep sync" of a TV series:
 *   series → seasons (with poster upload) → episodes (still stored as tmdb: initially)
 *
 * Strategy:
 *  - Seasons: sync + upload poster immediately (few per series)
 *  - Episode stills: stored as `tmdb:/path` by default.
 *    A separate `uploadEpisodeStills(seasonId)` method can be called
 *    lazily (first user access) or via a background job.
 */

import { db } from "../db";
import { media, seasons, episodes } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { storageService } from "./storage";
import { logger } from "../utils/logger";

const TMDB_API_KEY  = process.env.TMDB_API_KEY!;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p";

// ── Helpers ────────────────────────────────────────────────────────────────

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ api_key: TMDB_API_KEY, language: "en-US", ...params });
  const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${qs}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json() as T;
}

function tmdbImageUrl(path: string | null | undefined, size = "original"): string | null {
  if (!path) return null;
  return `${TMDB_IMG_BASE}/${size}${path}`;
}

function slugFrom(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// ── Types ──────────────────────────────────────────────────────────────────

interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episode_count: number;
}

interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
}

// ── Core sync functions ────────────────────────────────────────────────────

/**
 * Sync all seasons for a series. Called right after `importMedia` for TV.
 * Uploads season posters to B2.
 */
export async function syncSeriesSeasons(
  mediaId: string,
  tmdbId: number,
  mediaSlug: string
): Promise<void> {
  const data = await tmdbFetch<{ seasons: TMDBSeason[] }>(`/tv/${tmdbId}`);

  if (!data.seasons?.length) return;

  // Filter out "specials" (season 0) for now — can be toggled per-project
  const regularSeasons = data.seasons.filter((s) => s.season_number > 0);

  logger.info({ tmdbId, count: regularSeasons.length }, "Syncing seasons");

  for (const s of regularSeasons) {
    const folder = `series/${mediaSlug}/s${s.season_number}`;
    let posterPath: string | null = null;

    // Upload season poster to B2
    if (storageService.isConfigured() && s.poster_path) {
      try {
        const url = tmdbImageUrl(s.poster_path, "original")!;
        const res = await fetch(url);
        if (res.ok) {
          const { path } = await storageService.uploadSeasonPoster(
            await res.arrayBuffer(),
            folder
          );
          posterPath = path;
        }
      } catch (err) {
        logger.warn({ err, season: s.season_number }, "Season poster upload failed, using TMDB fallback");
      }
    }

    if (!posterPath && s.poster_path) {
      posterPath = `tmdb:${s.poster_path}`;
    }

    await db
      .insert(seasons)
      .values({
        mediaId,
        tmdbId: s.id,
        seasonNumber: s.season_number,
        name: s.name,
        overview: s.overview,
        posterPath,
        airDate: s.air_date ?? null,
        episodeCount: s.episode_count,
        syncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [seasons.mediaId, seasons.seasonNumber],
        set: {
          name: s.name,
          overview: s.overview,
          posterPath,
          airDate: s.air_date ?? null,
          episodeCount: s.episode_count,
          syncedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    // Small delay to respect TMDB rate limits
    await sleep(150);
  }

  logger.info({ tmdbId, count: regularSeasons.length }, "Seasons synced");
}

/**
 * Sync all episodes for one season.
 * Episode stills are stored as `tmdb:` paths (not uploaded yet).
 * Call `uploadSeasonStills` separately when needed.
 */
export async function syncSeasonEpisodes(
  seasonId: string,
  tmdbId: number,       // series TMDB id
  seasonNumber: number
): Promise<void> {
  const data = await tmdbFetch<{ episodes: TMDBEpisode[] }>(
    `/tv/${tmdbId}/season/${seasonNumber}`
  );

  if (!data.episodes?.length) return;

  logger.info({ tmdbId, seasonNumber, count: data.episodes.length }, "Syncing episodes");

  for (const e of data.episodes) {
    const stillPath = e.still_path ? `tmdb:${e.still_path}` : null;

    await db
      .insert(episodes)
      .values({
        seasonId,
        tmdbId: e.id,
        episodeNumber: e.episode_number,
        name: e.name,
        overview: e.overview,
        stillPath,
        airDate: e.air_date ?? null,
        runtime: e.runtime,
        voteAverage: e.vote_average,
        voteCount: e.vote_count,
      })
      .onConflictDoUpdate({
        target: [episodes.seasonId, episodes.episodeNumber],
        set: {
          name: e.name,
          overview: e.overview,
          stillPath,
          airDate: e.air_date ?? null,
          runtime: e.runtime,
          voteAverage: e.vote_average,
          voteCount: e.vote_count,
          updatedAt: new Date(),
        },
      });
  }

  // Update season episode count
  await db
    .update(seasons)
    .set({ episodeCount: data.episodes.length, syncedAt: new Date() })
    .where(eq(seasons.id, seasonId));

  logger.info({ seasonId, count: data.episodes.length }, "Episodes synced");
}

/**
 * Upload episode stills for a season from TMDB → B2.
 * Runs lazily (first user visits season page) or via background job.
 * Skips episodes that already have a B2 path.
 */
export async function uploadSeasonStills(
  seasonId: string,
  mediaSlug: string,
  seasonNumber: number
): Promise<{ uploaded: number; skipped: number }> {
  if (!storageService.isConfigured()) {
    return { uploaded: 0, skipped: 0 };
  }

  const eps = await db
    .select({ id: episodes.id, episodeNumber: episodes.episodeNumber, stillPath: episodes.stillPath })
    .from(episodes)
    .where(eq(episodes.seasonId, seasonId));

  let uploaded = 0;
  let skipped  = 0;

  for (const ep of eps) {
    // Already on B2 (path doesn't start with "tmdb:")
    if (ep.stillPath && !ep.stillPath.startsWith("tmdb:")) {
      skipped++;
      continue;
    }

    if (!ep.stillPath) {
      skipped++;
      continue;
    }

    const tmdbPath = ep.stillPath.replace("tmdb:", "");
    const url = tmdbImageUrl(tmdbPath, "original")!;
    const folder = `series/${mediaSlug}/s${seasonNumber}/e${ep.episodeNumber}`;

    try {
      const res = await fetch(url);
      if (!res.ok) { skipped++; continue; }

      const { path } = await storageService.uploadEpisodeStill(
        await res.arrayBuffer(),
        folder
      );

      await db
        .update(episodes)
        .set({ stillPath: path, updatedAt: new Date() })
        .where(eq(episodes.id, ep.id));

      uploaded++;
      await sleep(200);
    } catch (err) {
      logger.warn({ err, episodeId: ep.id }, "Episode still upload failed");
      skipped++;
    }
  }

  logger.info({ seasonId, uploaded, skipped }, "Episode stills upload complete");
  return { uploaded, skipped };
}

/**
 * Full deep sync of a series: all seasons + their episodes.
 * Fires in the background after the initial `importMedia` call.
 */
export async function deepSyncSeries(
  mediaId: string,
  tmdbId: number,
  mediaSlug: string
): Promise<void> {
  logger.info({ mediaId, tmdbId }, "Starting deep series sync");

  // 1. Sync seasons (with poster upload)
  await syncSeriesSeasons(mediaId, tmdbId, mediaSlug);

  // 2. For each synced season, sync episodes
  const syncedSeasons = await db
    .select({ id: seasons.id, seasonNumber: seasons.seasonNumber })
    .from(seasons)
    .where(eq(seasons.mediaId, mediaId));

  for (const season of syncedSeasons) {
    await syncSeasonEpisodes(season.id, tmdbId, season.seasonNumber);
    await sleep(300);
  }

  // 3. Update series episode/season counts
  const { media: mediaTable, sql: rawSql } = await import("../db");
  await db
    .update(mediaTable)
    .set({
      seasonsCount: syncedSeasons.length,
      updatedAt: new Date(),
    })
    .where(eq(mediaTable.id, mediaId));

  logger.info({ mediaId, seasons: syncedSeasons.length }, "Deep series sync complete");
}

// ── Utility ────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
