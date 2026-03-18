import { db, media } from "../db";
import { TMDBService } from "../services/tmdb";
import { logger } from "../utils/logger";

async function main() {
  logger.info("Starting media streaming backfill...");
  const tmdbService = new TMDBService();

  const allMedia = await db.select({
    id: media.id,
    tmdbId: media.tmdbId,
    type: media.type,
    title: media.title,
  }).from(media);

  logger.info(`Found ${allMedia.length} media items to sync.`);

  let successCount = 0;
  let errorCount = 0;

  for (const item of allMedia) {
    try {
      logger.info(`Syncing streaming providers for ${item.title} (TMDB ID: ${item.tmdbId})...`);
      await tmdbService.syncMedia(item.tmdbId, item.type);
      successCount++;
      // Sleep a bit to avoid hitting TMDB rate limits too hard
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      logger.error(`Failed to sync ${item.title}:`, error);
      errorCount++;
    }
  }

  logger.info(`Backfill complete. Successfully synced: ${successCount}, Errors: ${errorCount}`);
  process.exit(0);
}

main().catch(error => {
  logger.error("Fatal error during backfill:", error);
  process.exit(1);
});
