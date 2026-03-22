/**
 * migrate-to-tmdb-cdn.ts
 *
 * Migrates all TMDB-originated images from B2 storage to direct TMDB CDN paths.
 *
 * Steps:
 *   1. DB: Update media.posterPath / backdropPath from B2 paths → tmdb: paths
 *   2. DB: Update seasons.posterPath from B2 paths → tmdb: paths
 *   3. DB: Update episodes.stillPath from B2 paths → tmdb: paths
 *   4. B2: Delete all objects that are NOT user uploads
 *
 * User upload prefixes (kept in B2):
 *   avatars/, stories/, highlights/, covers/
 *
 * Usage:
 *   bun run scripts/migrate-to-tmdb-cdn.ts             # dry run (safe)
 *   bun run scripts/migrate-to-tmdb-cdn.ts --execute   # apply changes
 *   bun run scripts/migrate-to-tmdb-cdn.ts --skip-b2   # only fix DB, skip B2 cleanup
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, isNotNull, count } from "drizzle-orm";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(import.meta.dir, "../.env") });

// ── Config ────────────────────────────────────────────────────────────────────

const DRY_RUN = !process.argv.includes("--execute");
const SKIP_B2 = process.argv.includes("--skip-b2");

const TMDB_API_KEY = process.env.TMDB_API_KEY!;
const TMDB_BASE = "https://api.themoviedb.org/3";

const B2_CONFIG = {
  bucket: process.env.B2_BUCKET_NAME!,
  region: process.env.B2_REGION || "us-east-005",
  endpoint: process.env.B2_ENDPOINT!,
  keyId: process.env.B2_KEY_ID!,
  appKey: process.env.B2_APP_KEY!,
};

// B2 prefixes that belong to user uploads — never delete these
const USER_UPLOAD_PREFIXES = ["avatars/", "stories/", "highlights/", "covers/"];

// ── DB ────────────────────────────────────────────────────────────────────────

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// Inline schema references (avoid importing the full app schema)
import { media, seasons, episodes } from "../src/db/schema/index.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

// Returns true if the path needs to be fixed: null, B2 path, or any non-tmdb non-http path
function needsFix(path: string | null | undefined): boolean {
  if (!path) return true; // null/missing — must re-fetch
  if (path.startsWith("tmdb:")) return false; // already correct
  if (path.startsWith("http")) return false;  // already a full URL
  return true; // B2 path or anything else
}

async function tmdbFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${TMDB_BASE}${endpoint}?api_key=${TMDB_API_KEY}&language=en-US`);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json() as T;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function log(msg: string) {
  console.log(`[${DRY_RUN ? "DRY RUN" : "EXECUTE"}] ${msg}`);
}

// ── Step 0: Re-sync series that have no seasons in DB ────────────────────────

async function resyncMissingSeasons() {
  console.log("\n── Step 0: Series missing seasons ──────────────────────────────");

  const allSeries = await db
    .select({ id: media.id, tmdbId: media.tmdbId, slug: media.slug, title: media.title })
    .from(media)
    .where(eq(media.type, "series"));

  const missing: typeof allSeries = [];
  for (const s of allSeries) {
    const [{ cnt }] = await db
      .select({ cnt: count() })
      .from(seasons)
      .where(eq(seasons.mediaId, s.id));
    if ((cnt as unknown as number) === 0) missing.push(s);
  }

  console.log(`  Found ${missing.length} series with no seasons`);

  for (const s of missing) {
    log(`  Re-syncing: ${s.title} (tmdbId: ${s.tmdbId})`);
    if (!DRY_RUN) {
      const { syncSeriesSeasons, syncSeasonEpisodes } = await import("../src/services/tmdb-series.ts");
      await syncSeriesSeasons(s.id, s.tmdbId, s.slug);
      const syncedSeasons = await db
        .select({ id: seasons.id, seasonNumber: seasons.seasonNumber })
        .from(seasons)
        .where(eq(seasons.mediaId, s.id));
      for (const season of syncedSeasons) {
        await syncSeasonEpisodes(season.id, s.tmdbId, season.seasonNumber);
        await sleep(300);
      }
    }
    await sleep(500);
  }

  console.log(`  ✓ Done`);
}

// ── Step 1: Migrate media poster/backdrop ────────────────────────────────────

async function migrateMedia() {
  console.log("\n── Step 1: Media (poster + backdrop) ──────────────────────────");

  const rows = await db
    .select({ id: media.id, tmdbId: media.tmdbId, type: media.type, title: media.title, posterPath: media.posterPath, backdropPath: media.backdropPath })
    .from(media)
    .where(isNotNull(media.tmdbId));

  const toFix = rows.filter(
    (r) => needsFix(r.posterPath) || needsFix(r.backdropPath)
  );

  console.log(`  Found ${toFix.length} media records needing fix (out of ${rows.length} total)`);

  let updated = 0;
  let failed = 0;

  for (const row of toFix) {
    try {
      const endpoint = row.type === "movie" ? `/movie/${row.tmdbId}` : `/tv/${row.tmdbId}`;
      const data = await tmdbFetch<{ poster_path?: string | null; backdrop_path?: string | null }>(endpoint);

      const newPoster = data.poster_path ? `tmdb:${data.poster_path}` : null;
      const newBackdrop = data.backdrop_path ? `tmdb:${data.backdrop_path}` : null;

      log(`  ${row.title} → poster: ${row.posterPath ?? "null"} → ${newPoster ?? "null"}`);

      if (!DRY_RUN) {
        await db
          .update(media)
          .set({
            ...(needsFix(row.posterPath) ? { posterPath: newPoster } : {}),
            ...(needsFix(row.backdropPath) ? { backdropPath: newBackdrop } : {}),
            updatedAt: new Date(),
          })
          .where(eq(media.id, row.id));
      }

      updated++;
      await sleep(250); // respect TMDB rate limit
    } catch (err) {
      console.error(`  ✗ Failed for ${row.title} (tmdbId: ${row.tmdbId}):`, err);
      failed++;
    }
  }

  console.log(`  ✓ ${updated} updated, ${failed} failed`);
}

// ── Step 2: Migrate season posters ───────────────────────────────────────────

async function migrateSeasons() {
  console.log("\n── Step 2: Season posters ──────────────────────────────────────");

  const rows = await db
    .select({
      id: seasons.id,
      seasonNumber: seasons.seasonNumber,
      posterPath: seasons.posterPath,
      seriesTmdbId: media.tmdbId,
      seriesTitle: media.title,
    })
    .from(seasons)
    .innerJoin(media, eq(seasons.mediaId, media.id))
    .where(isNotNull(seasons.posterPath));

  const toFix = rows.filter((r) => needsFix(r.posterPath));

  console.log(`  Found ${toFix.length} season records needing fix (out of ${rows.length} total)`);

  let updated = 0;
  let failed = 0;

  for (const row of toFix) {
    try {
      const data = await tmdbFetch<{ poster_path?: string | null }>(
        `/tv/${row.seriesTmdbId}/season/${row.seasonNumber}`
      );

      const newPoster = data.poster_path ? `tmdb:${data.poster_path}` : null;

      log(`  ${row.seriesTitle} S${row.seasonNumber} → ${row.posterPath} → ${newPoster ?? "null"}`);

      if (!DRY_RUN) {
        await db
          .update(seasons)
          .set({ posterPath: newPoster, updatedAt: new Date() })
          .where(eq(seasons.id, row.id));
      }

      updated++;
      await sleep(250);
    } catch (err) {
      console.error(`  ✗ Failed for season ${row.seasonNumber} of ${row.seriesTitle}:`, err);
      failed++;
    }
  }

  console.log(`  ✓ ${updated} updated, ${failed} failed`);
}

// ── Step 3: Migrate episode stills ───────────────────────────────────────────

async function migrateEpisodes() {
  console.log("\n── Step 3: Episode stills ──────────────────────────────────────");

  const rows = await db
    .select({
      id: episodes.id,
      episodeNumber: episodes.episodeNumber,
      stillPath: episodes.stillPath,
      seasonNumber: seasons.seasonNumber,
      seriesTmdbId: media.tmdbId,
      seriesTitle: media.title,
    })
    .from(episodes)
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .innerJoin(media, eq(seasons.mediaId, media.id));

  const toFix = rows.filter((r) => needsFix(r.stillPath));

  console.log(`  Found ${toFix.length} episode records needing fix (out of ${rows.length} total)`);

  if (toFix.length === 0) {
    console.log("  Nothing to do.");
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const row of toFix) {
    try {
      const data = await tmdbFetch<{ still_path?: string | null }>(
        `/tv/${row.seriesTmdbId}/season/${row.seasonNumber}/episode/${row.episodeNumber}`
      );

      const newStill = data.still_path ? `tmdb:${data.still_path}` : null;

      log(`  ${row.seriesTitle} S${row.seasonNumber}E${row.episodeNumber} → ${newStill ?? "null"}`);

      if (!DRY_RUN) {
        await db
          .update(episodes)
          .set({ stillPath: newStill, updatedAt: new Date() })
          .where(eq(episodes.id, row.id));
      }

      updated++;
      await sleep(250);
    } catch (err) {
      console.error(`  ✗ Failed for S${row.seasonNumber}E${row.episodeNumber} of ${row.seriesTitle}:`, err);
      failed++;
    }
  }

  console.log(`  ✓ ${updated} updated, ${failed} failed`);
}

// ── Step 4: Clean B2 bucket ───────────────────────────────────────────────────

async function cleanB2() {
  console.log("\n── Step 4: B2 bucket cleanup ───────────────────────────────────");

  if (!B2_CONFIG.bucket || !B2_CONFIG.endpoint || !B2_CONFIG.keyId) {
    console.log("  B2 not configured, skipping.");
    return;
  }

  const s3 = new S3Client({
    region: B2_CONFIG.region,
    endpoint: B2_CONFIG.endpoint,
    credentials: { accessKeyId: B2_CONFIG.keyId, secretAccessKey: B2_CONFIG.appKey },
    forcePathStyle: true,
  });

  const toDelete: string[] = [];
  let continuationToken: string | undefined;

  console.log("  Listing B2 objects...");

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: B2_CONFIG.bucket,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of res.Contents ?? []) {
      const key = obj.Key!;
      const isUserUpload = USER_UPLOAD_PREFIXES.some((prefix) => key.startsWith(prefix));
      if (!isUserUpload) {
        toDelete.push(key);
      }
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`  Found ${toDelete.length} objects to delete (TMDB images)`);

  if (toDelete.length === 0) {
    console.log("  Nothing to delete.");
    return;
  }

  // Preview first 20
  toDelete.slice(0, 20).forEach((k) => log(`  DELETE: ${k}`));
  if (toDelete.length > 20) {
    log(`  ... and ${toDelete.length - 20} more`);
  }

  if (DRY_RUN) return;

  // Batch delete in chunks of 1000 (S3 limit)
  const chunks = [];
  for (let i = 0; i < toDelete.length; i += 1000) {
    chunks.push(toDelete.slice(i, i + 1000));
  }

  let deleted = 0;
  for (const chunk of chunks) {
    const res = await s3.send(
      new DeleteObjectsCommand({
        Bucket: B2_CONFIG.bucket,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
    deleted += chunk.length - (res.Errors?.length ?? 0);
    if (res.Errors?.length) {
      console.error("  B2 delete errors:", res.Errors);
    }
  }

  console.log(`  ✓ Deleted ${deleted} objects from B2`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log(`║  migrate-to-tmdb-cdn   ${DRY_RUN ? "MODE: DRY RUN (safe preview)" : "MODE: EXECUTE (real changes)"}`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  if (DRY_RUN) {
    console.log("\n  Run with --execute to apply changes.\n");
  }

  await resyncMissingSeasons();
  await migrateMedia();
  await migrateSeasons();
  await migrateEpisodes();

  if (!SKIP_B2) {
    await cleanB2();
  } else {
    console.log("\n── Step 4: B2 cleanup skipped (--skip-b2) ──────────────────────");
  }

  console.log("\n✓ Done.");
  await client.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
