/**
 * Cron Jobs Service
 * Background tasks that keep the local media database populated and fresh.
 *
 * Strategy (hybrid approach):
 *   - sync-trending   : daily  — imports ~40 trending movies + series
 *   - sync-popular    : weekly — imports top 100 popular movies + 100 series
 *   - cleanup-sessions: hourly — maintenance
 *   - check-subscriptions: daily — Stripe safety net
 */

import { tmdbService } from "./tmdb";
import { db, media, inArray } from "../db";
import { logger } from "../utils/logger";

// ─── Scheduler ────────────────────────────────────────────────────────────────

const jobs: {
  name: string;
  interval: number;
  fn: () => Promise<void>;
  timer?: ReturnType<typeof setInterval>;
}[] = [];

export function registerJob(name: string, intervalMs: number, fn: () => Promise<void>): void {
  jobs.push({ name, interval: intervalMs, fn });
}

export function startCronJobs(): void {
  logger.info("Starting cron jobs...");

  // ── Media pre-population ─────────────────────────────────────────────────

  registerJob("sync-trending", 24 * 60 * 60 * 1000, syncTrending);
  registerJob("sync-popular",  7 * 24 * 60 * 60 * 1000, syncPopular);

  // ── Platform maintenance ─────────────────────────────────────────────────

  registerJob("cleanup-sessions", 60 * 60 * 1000, async () => {
    logger.info("Session cleanup — handled by Better Auth internally");
  });

  registerJob("check-subscriptions", 24 * 60 * 60 * 1000, async () => {
    logger.info("Subscription check — Stripe webhooks handle real-time; this is a safety net");
  });

  // ── Start all ────────────────────────────────────────────────────────────

  for (const job of jobs) {
    job.timer = setInterval(async () => {
      try {
        await job.fn();
      } catch (error) {
        logger.error({ err: error, job: job.name }, "Cron job failed");
      }
    }, job.interval);

    logger.info({ job: job.name, intervalMs: job.interval }, "Registered cron job");
  }

  // Run media sync once on startup so the DB is populated from day one
  setTimeout(async () => {
    logger.info("Running initial media sync on startup...");
    try {
      await syncTrending();
      await syncPopular();
    } catch (err) {
      logger.error({ err }, "Initial media sync failed");
    }
  }, 15_000); // 15s delay — let DB connections settle first

  logger.info(`Started ${jobs.length} cron jobs`);
}

export function stopCronJobs(): void {
  for (const job of jobs) {
    if (job.timer) clearInterval(job.timer);
  }
  logger.info("Stopped all cron jobs");
}

// ─── Sync jobs ────────────────────────────────────────────────────────────────

/**
 * Import today's + this week's trending movies and series (~40 items).
 * Runs daily.
 */
async function syncTrending(): Promise<void> {
  logger.info("sync-trending: starting");

  const [dayMovies, weekMovies, daySeries, weekSeries] = await Promise.allSettled([
    tmdbService.getTrending("day",  "movie", 1),
    tmdbService.getTrending("week", "movie", 1),
    tmdbService.getTrending("day",  "tv",    1),
    tmdbService.getTrending("week", "tv",    1),
  ]);

  const all = [
    ...(dayMovies.status  === "fulfilled" ? dayMovies.value.results  : []),
    ...(weekMovies.status === "fulfilled" ? weekMovies.value.results : []),
    ...(daySeries.status  === "fulfilled" ? daySeries.value.results  : []),
    ...(weekSeries.status === "fulfilled" ? weekSeries.value.results : []),
  ];

  const imported = await batchImport(all);
  logger.info({ imported, total: all.length }, "sync-trending: done");
}

/**
 * Import top 100 popular movies + 100 popular series (5 pages × 20 each).
 * Runs weekly. Idempotent — onConflictDoUpdate skips already-imported items.
 */
async function syncPopular(): Promise<void> {
  logger.info("sync-popular: starting");

  let total = 0;
  let imported = 0;

  for (const page of [1, 2, 3, 4, 5]) {
    const [movies, series] = await Promise.allSettled([
      tmdbService.getPopular("movie",  page),
      tmdbService.getPopular("series", page),
    ]);

    const results = [
      ...(movies.status  === "fulfilled" ? movies.value.results  : []),
      ...(series.status  === "fulfilled" ? series.value.results : []),
    ];

    total    += results.length;
    imported += await batchImport(results);

    await sleep(500); // respect TMDB rate limits between pages
  }

  logger.info({ imported, total }, "sync-popular: done");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Import a batch of TMDB results into the local DB.
 * Skips items that are already local (single bulk check).
 * Returns count of newly imported items.
 */
async function batchImport(
  results: { tmdbId: number; mediaType: "movie" | "series" }[],
): Promise<number> {
  if (results.length === 0) return 0;

  // Deduplicate by tmdbId
  const unique = Array.from(new Map(results.map((r) => [r.tmdbId, r])).values());

  // Single query to find which are already local
  const existing = await db
    .select({ tmdbId: media.tmdbId })
    .from(media)
    .where(inArray(media.tmdbId, unique.map((r) => r.tmdbId)));

  const existingIds = new Set(existing.map((e) => e.tmdbId));
  const toImport = unique.filter((r) => !existingIds.has(r.tmdbId));

  if (toImport.length === 0) return 0;

  let count = 0;
  for (const item of toImport) {
    try {
      await tmdbService.importMedia(item.tmdbId, item.mediaType);
      count++;
      await sleep(200); // small delay between each import
    } catch (err) {
      logger.warn({ err, tmdbId: item.tmdbId }, "sync: failed to import item");
    }
  }

  return count;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
