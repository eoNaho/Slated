/**
 * services/tmdb-gallery.ts
 *
 * Syncs media gallery data (videos + images) from TMDB to the local database.
 *
 * Strategy:
 *  - Videos: stored with YouTube/Vimeo key — no image assets involved
 *  - Images: stored as `tmdb:/path` by default (TMDB CDN served)
 *    When TMDB_UPLOAD_TO_STORAGE=true, images are downloaded and uploaded to B2
 *
 * Called fire-and-forget from syncMedia() after the main transaction.
 */

import { resolve } from "path";
import { config } from "dotenv";
config({ path: resolve(import.meta.dir, "../../.env") });

import { db } from "../db";
import { mediaVideos, mediaImages } from "../db/schema";
import { sql } from "drizzle-orm";
import { storageService } from "./storage";
import { logger } from "../utils/logger";

const TMDB_API_KEY = process.env.TMDB_API_KEY!;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p";

const UPLOAD_TMDB_IMAGES = process.env.TMDB_UPLOAD_TO_STORAGE === "true";

const VIDEO_CAP = 30;
const IMAGE_CAP = 50;

// ── Types ──────────────────────────────────────────────────────────────────────

interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  type: string;
  site: string;
  official: boolean;
  size: number;
  published_at: string;
}

interface TMDBImage {
  file_path: string;
  width: number;
  height: number;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
}

interface TMDBImagesResponse {
  backdrops?: TMDBImage[];
  posters?: TMDBImage[];
  logos?: TMDBImage[];
}

interface TMDBVideosResponse {
  results?: TMDBVideo[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ api_key: TMDB_API_KEY, ...params });
  const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${qs}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json() as T;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Core ───────────────────────────────────────────────────────────────────────

/**
 * Sync gallery data for a media item from TMDB to the local DB.
 * Safe to call multiple times — uses upsert (onConflictDoUpdate).
 */
export async function syncMediaGallery(
  mediaId: string,
  tmdbId: number,
  type: "movie" | "series"
): Promise<void> {
  const base = type === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;

  logger.info({ mediaId, tmdbId, type }, "Syncing media gallery");

  const [imagesData, videosData] = await Promise.all([
    tmdbFetch<TMDBImagesResponse>(base + "/images", {
      include_image_language: "en,null",
    }),
    tmdbFetch<TMDBVideosResponse>(base + "/videos", {
      language: "en-US",
    }),
  ]);

  // ── Videos ────────────────────────────────────────────────────────────────

  const videos = (videosData.results ?? [])
    .filter((v) => v.site === "YouTube" || v.site === "Vimeo")
    .slice(0, VIDEO_CAP);

  if (videos.length > 0) {
    await db
      .insert(mediaVideos)
      .values(videos.map((v) => ({
        mediaId,
        tmdbKey: v.key,
        name: v.name,
        type: v.type,
        site: v.site,
        official: v.official,
        size: v.size,
        publishedAt: v.published_at ? new Date(v.published_at) : null,
      })))
      .onConflictDoUpdate({
        target: [mediaVideos.mediaId, mediaVideos.tmdbKey],
        set: {
          name: sql`excluded.name`,
          type: sql`excluded.type`,
          official: sql`excluded.official`,
          size: sql`excluded.size`,
        },
      });
  }

  logger.info({ mediaId, count: videos.length }, "Gallery videos synced");

  // ── Images ────────────────────────────────────────────────────────────────

  const imageGroups: { type: "backdrop" | "poster" | "logo"; items: TMDBImage[] }[] = [
    { type: "backdrop", items: (imagesData.backdrops ?? []).slice(0, IMAGE_CAP) },
    { type: "poster",   items: (imagesData.posters  ?? []).slice(0, IMAGE_CAP) },
    { type: "logo",     items: (imagesData.logos    ?? []).slice(0, 20) },
  ];

  // When UPLOAD_TMDB_IMAGES is off (default), build all values in one pass
  if (!UPLOAD_TMDB_IMAGES || !storageService.isConfigured()) {
    const allImageValues = imageGroups.flatMap(({ type: imgType, items }) =>
      items.map((img) => ({
        mediaId,
        imageType: imgType,
        filePath: `tmdb:${img.file_path}`,
        width: img.width,
        height: img.height,
        language: img.iso_639_1 ?? null,
        voteAverage: img.vote_average,
        voteCount: img.vote_count,
      }))
    );

    if (allImageValues.length > 0) {
      await db
        .insert(mediaImages)
        .values(allImageValues)
        .onConflictDoUpdate({
          target: [mediaImages.mediaId, mediaImages.imageType, mediaImages.filePath],
          set: {
            voteAverage: sql`excluded.vote_average`,
            voteCount: sql`excluded.vote_count`,
          },
        });
    }
  } else {
    // B2 upload path — must process individually (sequential uploads)
    for (const { type: imgType, items } of imageGroups) {
      for (const img of items) {
        let filePath = `tmdb:${img.file_path}`;
        try {
          const url = `${TMDB_IMG_BASE}/original${img.file_path}`;
          const res = await fetch(url);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const folder = `gallery/${mediaId}/${imgType}s`;
            const result = imgType === "backdrop"
              ? await storageService.uploadBackdrop(buffer, folder)
              : await storageService.uploadPoster(buffer, folder);
            filePath = result.path;
          }
        } catch (e) {
          logger.warn({ error: e, file_path: img.file_path }, "Gallery image upload failed, using tmdb: path");
        }

        await db
          .insert(mediaImages)
          .values({
            mediaId,
            imageType: imgType,
            filePath,
            width: img.width,
            height: img.height,
            language: img.iso_639_1 ?? null,
            voteAverage: img.vote_average,
            voteCount: img.vote_count,
          })
          .onConflictDoUpdate({
            target: [mediaImages.mediaId, mediaImages.imageType, mediaImages.filePath],
            set: {
              voteAverage: img.vote_average,
              voteCount: img.vote_count,
            },
          });
      }
    }
  }

  const totalImages = imageGroups.reduce((s, g) => s + g.items.length, 0);
  logger.info({ mediaId, totalImages }, "Gallery images synced");
}

// ── Backfill script ────────────────────────────────────────────────────────────
// Run directly: bun run apps/api/src/services/tmdb-gallery.ts --backfill

if (process.argv.includes("--backfill")) {
  const { media } = await import("../db/schema");
  const { isNotNull } = await import("drizzle-orm");

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  tmdb-gallery backfill                           ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Fetch all media
  const allMedia = await db
    .select({ id: media.id, tmdbId: media.tmdbId, type: media.type, title: media.title })
    .from(media)
    .where(isNotNull(media.tmdbId));

  // Find which mediaIds already have at least one video entry (single batch query)
  const syncedIds = new Set(
    (await db.selectDistinct({ mediaId: mediaVideos.mediaId }).from(mediaVideos))
      .map((r) => r.mediaId)
  );

  const missing = allMedia.filter((m) => !syncedIds.has(m.id));

  console.log(`  Total media:   ${allMedia.length}`);
  console.log(`  Already synced: ${allMedia.length - missing.length}`);
  console.log(`  To sync:        ${missing.length}\n`);

  if (missing.length === 0) {
    console.log("  Nothing to do.");
    process.exit(0);
  }

  let done = 0;
  let failed = 0;
  const CONCURRENCY = 5;

  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (m) => {
      try {
        await syncMediaGallery(m.id, m.tmdbId!, m.type as "movie" | "series");
        done++;
        process.stdout.write(`  [${done + failed}/${missing.length}] ✓ ${m.title}\n`);
      } catch (err) {
        failed++;
        process.stdout.write(`  [${done + failed}/${missing.length}] ✗ ${m.title} — ${(err as Error).message}\n`);
      }
    }));
    // Brief pause between batches to respect TMDB rate limits
    if (i + CONCURRENCY < missing.length) await sleep(500);
  }

  console.log(`\n✓ Done. ${done} synced, ${failed} failed.`);
  process.exit(0);
}
