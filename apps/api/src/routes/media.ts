import { Elysia, t } from "elysia";
import {
  db,
  media,
  user as userTable,
  genres,
  mediaGenres,
  mediaCredits,
  people,
  mediaStreaming,
  streamingServices,
  eq,
  and,
  ilike,
  desc,
  count,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";
import { tmdbService } from "../services/tmdb";
import { metadataService } from "../services/metadata.service";
import { storageService } from "../services/storage";
import { logger } from "../utils/logger";

// ============================================================================
// Helper to resolve image URLs
// ============================================================================

function resolveImageUrl(path: string | null): string | null {
  if (!path) return null;
  return storageService.getImageUrl(path);
}

// ============================================================================
// Media Routes
// ============================================================================

export const mediaRoutes = new Elysia({ prefix: "/media", tags: ["Media"] })
  .use(betterAuthPlugin)

  // ==========================================================================
  // DISCOVER (Letterboxd Style)
  // Search was moved to GET /search — see routes/search.ts
  // ==========================================================================

  /**
   * GET /media/discover
   * Discover media with filters (genre, year, sort)
   */
  .get(
    "/discover",
    async ({ query, set }) => {
      const {
        type = "movie",
        genre,
        year,
        sortBy = "popularity",
        page = 1,
        language = "en-US",
      } = query;

      try {
        const results = await metadataService.discover({
          type: type as "movie" | "series",
          genre: genre ? Number(genre) : undefined,
          year: year ? Number(year) : undefined,
          sortBy: sortBy as any,
          page: Number(page),
          language,
        });

        return {
          data: results.results,
          page: results.page,
          totalPages: results.totalPages,
          total: results.totalResults,
          hasNext: results.page < results.totalPages,
          hasPrev: results.page > 1,
        };
      } catch (error) {
        logger.error({ error, query }, "Discover failed");
        set.status = 500;
        return { error: "Failed to discover media" };
      }
    },
    {
      query: t.Object({
        type: t.Optional(t.Union([t.Literal("movie"), t.Literal("series")])),
        genre: t.Optional(t.String()),
        year: t.Optional(t.String()),
        sortBy: t.Optional(
          t.Union([
            t.Literal("popularity"),
            t.Literal("rating"),
            t.Literal("release_date"),
            t.Literal("revenue"),
            t.Literal("vote_count"),
          ]),
        ),
        page: t.Optional(t.String()),
        language: t.Optional(t.String()),
      }),
    },
  )

  // ==========================================================================
  // LISTS & TRENDS
  // ==========================================================================

  /**
   * GET /media/trending
   */
  .get(
    "/trending",
    async ({ query, set }) => {
      const { timeWindow = "week", type = "all", page = 1 } = query;

      try {
        const results = await metadataService.getTrending(
          timeWindow as "day" | "week",
          type as "movie" | "series" | "all",
          Number(page),
        );

        return {
          data: results.results,
          page: results.page,
          totalPages: results.totalPages,
          total: results.totalResults,
          hasNext: results.page < results.totalPages,
          hasPrev: results.page > 1,
        };
      } catch (error) {
        logger.error({ error }, "Trending failed");
        set.status = 500;
        return { error: "Failed to get trending media" };
      }
    },
    {
      query: t.Object({
        timeWindow: t.Optional(t.Union([t.Literal("day"), t.Literal("week")])),
        type: t.Optional(
          t.Union([t.Literal("movie"), t.Literal("series"), t.Literal("all")]),
        ),
        page: t.Optional(t.String()),
      }),
    },
  )

  /**
   * GET /media/popular
   */
  .get(
    "/popular",
    async ({ query, set }) => {
      const { type = "movie", page = 1 } = query;

      try {
        const results = await metadataService.getPopular(
          type as "movie" | "series",
          Number(page),
        );

        return {
          data: results.results,
          page: results.page,
          totalPages: results.totalPages,
          total: results.totalResults,
          hasNext: results.page < results.totalPages,
          hasPrev: results.page > 1,
        };
      } catch (error) {
        logger.error({ error }, "Popular failed");
        set.status = 500;
        return { error: "Failed to get popular media" };
      }
    },
    {
      query: t.Object({
        type: t.Optional(t.Union([t.Literal("movie"), t.Literal("series")])),
        page: t.Optional(t.String()),
      }),
    },
  )

  /**
   * GET /media/top-rated
   */
  .get(
    "/top-rated",
    async ({ query, set }) => {
      const { type = "movie", page = 1 } = query;

      try {
        const results = await metadataService.getTopRated(
          type as "movie" | "series",
          Number(page),
        );

        return {
          data: results.results,
          page: results.page,
          totalPages: results.totalPages,
          total: results.totalResults,
          hasNext: results.page < results.totalPages,
          hasPrev: results.page > 1,
        };
      } catch (error) {
        logger.error({ error }, "Top rated failed");
        set.status = 500;
        return { error: "Failed to get top rated media" };
      }
    },
    {
      query: t.Object({
        type: t.Optional(t.Union([t.Literal("movie"), t.Literal("series")])),
        page: t.Optional(t.String()),
      }),
    },
  )

  /**
   * GET /media/upcoming
   */
  .get(
    "/upcoming",
    async ({ query, set }) => {
      const { page = 1 } = query;

      try {
        const results = await metadataService.getUpcoming(Number(page));
        return {
          data: results.results,
          page: results.page,
          totalPages: results.totalPages,
          total: results.totalResults,
          hasNext: results.page < results.totalPages,
          hasPrev: results.page > 1,
        };
      } catch (error) {
        logger.error({ error }, "Upcoming failed");
        set.status = 500;
        return { error: "Failed to get upcoming movies" };
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
      }),
    },
  )

  // ==========================================================================
  // IMPORT & PREVIEW
  // ==========================================================================

  /**
   * GET /media/:tmdbId/preview
   * Get enriched metadata preview without importing
   */
  .get(
    "/tmdb/:tmdbId/preview",
    async ({ params, query, set }) => {
      const { type } = query;

      if (!type) {
        set.status = 400;
        return { error: "Type is required (movie or series)" };
      }

      try {
        const enrichedData = await metadataService.getEnrichedMetadata(
          Number(params.tmdbId),
          type as "movie" | "series",
        );

        return { data: enrichedData };
      } catch (error) {
        logger.error({ error, tmdbId: params.tmdbId }, "Preview failed");
        set.status = 500;
        return { error: "Failed to get media preview" };
      }
    },
    {
      params: t.Object({
        tmdbId: t.String(),
      }),
      query: t.Object({
        type: t.Union([t.Literal("movie"), t.Literal("series")]),
      }),
    },
  )

  /**
   * POST /media/import
   * Import media from TMDB to DB
   */
  .post(
    "/import",
    async ({ body, set }) => {
      const { tmdbId, type } = body;

      try {
        // Check if exists
        const [existing] = await db
          .select({ id: media.id, slug: media.slug })
          .from(media)
          .where(eq(media.tmdbId, tmdbId))
          .limit(1);

        if (existing) {
          return {
            success: true,
            message: "Media already exists",
            mediaId: existing.id,
            slug: existing.slug,
            alreadyExists: true,
          };
        }

        // Get enriched metadata first
        const enrichedData = await metadataService.getEnrichedMetadata(
          tmdbId,
          type,
        );

        // Import
        const importedMedia = await tmdbService.importMedia(tmdbId, type);

        // Update ratings
        if (enrichedData.ratings.imdb || enrichedData.ratings.metacritic) {
          await db
            .update(media)
            .set({
              imdbRating: enrichedData.ratings.imdb?.rating || null,
              imdbVotes: enrichedData.ratings.imdb?.votes || null,
              metacriticScore: enrichedData.ratings.metacritic || null,
              rottenTomatoesScore: enrichedData.ratings.rottenTomatoes || null,
            })
            .where(eq(media.id, importedMedia.id));
        }

        return {
          success: true,
          message: "Media imported successfully",
          mediaId: importedMedia.id,
          slug: importedMedia.slug,
          data: {
            id: importedMedia.id,
            slug: importedMedia.slug,
            title: enrichedData.title,
            ratings: enrichedData.ratings,
          },
        };
      } catch (error) {
        logger.error({ error, tmdbId }, "Import failed");
        set.status = 500;
        return { error: "Failed to import media" };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        tmdbId: t.Number(),
        type: t.Union([t.Literal("movie"), t.Literal("series")]),
      }),
    },
  )

  /**
   * POST /media/import/batch
   */
  .post(
    "/import/batch",
    async ({ body, set }) => {
      const { items } = body;

      if (!items || items.length === 0) {
        set.status = 400;
        return { error: "No items to import" };
      }

      if (items.length > 50) {
        set.status = 400;
        return { error: "Maximum 50 items per batch" };
      }

      const results = {
        success: [] as string[],
        failed: [] as { tmdbId: number; error: string }[],
        skipped: [] as number[],
      };

      for (const item of items) {
        try {
          const [existing] = await db
            .select({ id: media.id })
            .from(media)
            .where(eq(media.tmdbId, item.tmdbId))
            .limit(1);

          if (existing) {
            results.skipped.push(item.tmdbId);
            continue;
          }

          const imported = await tmdbService.importMedia(
            item.tmdbId,
            item.type,
          );
          results.success.push(imported.id);

          // Rate limit
          await new Promise((r) => setTimeout(r, 100));
        } catch (error: unknown) {
          results.failed.push({
            tmdbId: item.tmdbId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        results: {
          imported: results.success.length,
          skipped: results.skipped.length,
          failed: results.failed.length,
          details: results,
        },
      };
    },
    {
      requireAuth: true,
      body: t.Object({
        items: t.Array(
          t.Object({
            tmdbId: t.Number(),
            type: t.Union([t.Literal("movie"), t.Literal("series")]),
          }),
        ),
      }),
    },
  )

  // ==========================================================================
  // LOCAL LIBRARY & DETAILS
  // ==========================================================================

  /**
   * GET /media/library
   * Get media from local database
   */
  .get(
    "/library",
    async ({ query }) => {
      const type = query.type as "movie" | "series" | undefined;
      const q = query.q?.trim() || "";
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const conditions = [];
      if (type) conditions.push(eq(media.type, type));
      if (q) conditions.push(ilike(media.title, `%${q}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [results, [countResult]] = await Promise.all([
        db.select().from(media).where(where).orderBy(desc(media.popularity)).limit(limit).offset(offset),
        db.select({ total: count() }).from(media).where(where),
      ]);
      const total = countResult.total;

      // Resolve image URLs
      const data = results.map((item) => ({
        ...item,
        posterPath: resolveImageUrl(item.posterPath),
        backdropPath: resolveImageUrl(item.backdropPath),
      }));

      return {
        data,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      };
    },
    {
      query: t.Object({
        type: t.Optional(t.String()),
        q: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
      }),
    },
  )

  /**
   * GET /media/slug/:slug
   * Get media by slug.
   * Auto-imports from TMDB on first visit if not in local DB,
   * so the database grows organically as users browse.
   */
  .get(
    "/slug/:slug",
    async ({ params, set }) => {
      async function fetchLocalFull(id: string) {
        const [item] = await db.select().from(media).where(eq(media.id, id)).limit(1);
        if (!item) return null;
        const [mediaGenresList, credits, streaming] = await Promise.all([
          db.select({ genre: genres }).from(mediaGenres).innerJoin(genres, eq(mediaGenres.genreId, genres.id)).where(eq(mediaGenres.mediaId, id)),
          db.select({ credit: mediaCredits, person: people }).from(mediaCredits).innerJoin(people, eq(mediaCredits.personId, people.id)).where(eq(mediaCredits.mediaId, id)).orderBy(mediaCredits.castOrder).limit(40),
          db.select({ streaming: mediaStreaming, service: streamingServices }).from(mediaStreaming).innerJoin(streamingServices, eq(mediaStreaming.serviceId, streamingServices.id)).where(eq(mediaStreaming.mediaId, id)),
        ]);
        return {
          data: {
            ...item,
            posterPath: resolveImageUrl(item.posterPath),
            backdropPath: resolveImageUrl(item.backdropPath),
            genres: mediaGenresList.map((g) => g.genre),
            credits: credits.map((c) => ({
              ...c.credit,
              person: { ...c.person, profilePath: resolveImageUrl(c.person.profilePath) },
            })),
            streaming: streaming.map((s) => ({ ...s.streaming, service: s.service })),
          },
        };
      }

      // ── 1. Local DB hit by slug ───────────────────────────────────────────
      const [existing] = await db
        .select({ id: media.id })
        .from(media)
        .where(eq(media.slug, params.slug))
        .limit(1);

      if (existing) {
        return await fetchLocalFull(existing.id);
      }

      // ── 2. Auto-import from TMDB ──────────────────────────────────────────
      const title = params.slug.replace(/-/g, " ");
      try {
        const searchResults = await metadataService.search(title, { page: 1 });
        const first = searchResults.results[0];

        if (!first) {
          set.status = 404;
          return { error: "Media not found" };
        }

        // Check if already imported under a different slug (same tmdbId)
        const [existingByTmdb] = await db
          .select({ id: media.id })
          .from(media)
          .where(eq(media.tmdbId, first.tmdbId))
          .limit(1);

        const importedId = existingByTmdb?.id
          ?? (await tmdbService.importMedia(first.tmdbId, first.mediaType as "movie" | "series")).id;

        // Async enrich with OMDB ratings — fire and forget, don't block response
        if (!existingByTmdb) {
          metadataService.getEnrichedMetadata(first.tmdbId, first.mediaType as "movie" | "series")
            .then(async (enriched) => {
              const ratings = enriched.ratings;
              if (ratings.imdb || ratings.metacritic || ratings.rottenTomatoes) {
                await db.update(media).set({
                  imdbRating: ratings.imdb?.rating ?? null,
                  imdbVotes: ratings.imdb?.votes ?? null,
                  metacriticScore: ratings.metacritic ?? null,
                  rottenTomatoesScore: ratings.rottenTomatoes ?? null,
                }).where(eq(media.id, importedId));
              }
            })
            .catch(() => {/* enrichment is best-effort */});
        }

        return await fetchLocalFull(importedId);
      } catch (err) {
        logger.error({ err, slug: params.slug }, "Auto-import failed");
        set.status = 404;
        return { error: "Media not found" };
      }
    },
    { params: t.Object({ slug: t.String() }) },
  )

  /**
   * GET /media/:id
   * Get Details (Local)
   */
  .get(
    "/:id",
    async ({ params, set }) => {
      const [item] = await db
        .select()
        .from(media)
        .where(eq(media.id, params.id))
        .limit(1);

      if (!item) {
        set.status = 404;
        return { error: "Media not found" };
      }

      // Get genres, credits, streaming in parallel
      const [mediaGenresList, credits, streaming] = await Promise.all([
        db.select({ genre: genres })
          .from(mediaGenres)
          .innerJoin(genres, eq(mediaGenres.genreId, genres.id))
          .where(eq(mediaGenres.mediaId, params.id)),
        db.select({ credit: mediaCredits, person: people })
          .from(mediaCredits)
          .innerJoin(people, eq(mediaCredits.personId, people.id))
          .where(eq(mediaCredits.mediaId, params.id))
          .orderBy(mediaCredits.castOrder)
          .limit(20),
        db.select({ streaming: mediaStreaming, service: streamingServices })
          .from(mediaStreaming)
          .innerJoin(streamingServices, eq(mediaStreaming.serviceId, streamingServices.id))
          .where(eq(mediaStreaming.mediaId, params.id)),
      ]);

      return {
        data: {
          ...item,
          posterPath: resolveImageUrl(item.posterPath),
          backdropPath: resolveImageUrl(item.backdropPath),
          genres: mediaGenresList.map((g) => g.genre),
          credits: credits.map((c) => ({
            ...c.credit,
            person: {
              ...c.person,
              profilePath: resolveImageUrl(c.person.profilePath),
            },
          })),
          streaming: streaming.map((s) => ({
            ...s.streaming,
            service: s.service,
          })),
        },
      };
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
    },
  )

  /**
   * GET /media/:id/state
   * Get authenticated user's state for this media
   */
  .get(
    "/:id/state",
    async (ctx: any) => {
      const { user, params } = ctx;
      if (!user) {
        return { data: { liked: false, watched: false, inWatchlist: false, rating: null, review: null } };
      }

      const { likes, diary, watchlist, reviews, mediaCustomCovers } = await import("../db");

      const [likeRecord, watchRecord, watchlistRecord, reviewRecord, coverRecord] = await Promise.all([
        db.select({ id: likes.id }).from(likes).where(
          and(eq(likes.userId, user.id), eq(likes.targetType, "media"), eq(likes.targetId, params.id))
        ).limit(1).then(r => r[0]),
        db.select({ id: diary.id, notes: diary.notes, rating: diary.rating }).from(diary).where(
          and(eq(diary.userId, user.id), eq(diary.mediaId, params.id))
        ).orderBy(desc(diary.watchedAt)).limit(1).then(r => r[0]),
        db.select({ id: watchlist.id }).from(watchlist).where(
          and(eq(watchlist.userId, user.id), eq(watchlist.mediaId, params.id))
        ).limit(1).then(r => r[0]),
        db.select({ rating: reviews.rating, content: reviews.content }).from(reviews).where(
          and(eq(reviews.userId, user.id), eq(reviews.mediaId, params.id))
        ).limit(1).then(r => r[0]),
        db.select({ imagePath: mediaCustomCovers.imagePath }).from(mediaCustomCovers).where(
          and(eq(mediaCustomCovers.userId, user.id), eq(mediaCustomCovers.mediaId, params.id))
        ).limit(1).then(r => r[0]),
      ]);

      return {
        data: {
          liked: !!likeRecord,
          watched: !!watchRecord,
          inWatchlist: !!watchlistRecord,
          rating: reviewRecord?.rating ?? watchRecord?.rating ?? null,
          review: reviewRecord?.content ?? watchRecord?.notes ?? null,
          customCoverUrl: coverRecord?.imagePath ? storageService.getImageUrl(coverRecord.imagePath) : null,
        },
      };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String({ format: "uuid" }) }),
    }
  )

  /**
   * GET /media/:tmdbId/recommendations
   */
  .get(
    "/tmdb/:tmdbId/recommendations",
    async ({ params, query, set }) => {
      const { type = "movie", page = 1 } = query;

      try {
        const results = await metadataService.getRecommendations(
          Number(params.tmdbId),
          type as "movie" | "series",
          Number(page),
        );

        return {
          data: results.results,
          page: results.page,
          totalPages: results.totalPages,
          total: results.totalResults,
          hasNext: results.page < results.totalPages,
          hasPrev: results.page > 1,
        };
      } catch (error) {
        logger.error(
          { error, tmdbId: params.tmdbId },
          "Recommendations failed",
        );
        set.status = 500;
        return { error: "Failed to get recommendations" };
      }
    },
    {
      params: t.Object({
        tmdbId: t.String(),
      }),
      query: t.Object({
        type: t.Optional(t.Union([t.Literal("movie"), t.Literal("series")])),
        page: t.Optional(t.String()),
      }),
    },
  )

  /**
   * GET /media/:tmdbId/similar
   */
  .get(
    "/tmdb/:tmdbId/similar",
    async ({ params, query, set }) => {
      const { type = "movie", page = 1 } = query;

      try {
        const results = await metadataService.getSimilar(
          Number(params.tmdbId),
          type as "movie" | "series",
          Number(page),
        );

        return {
          data: results.results,
          page: results.page,
          totalPages: results.totalPages,
          total: results.totalResults,
          hasNext: results.page < results.totalPages,
          hasPrev: results.page > 1,
        };
      } catch (error) {
        logger.error({ error, tmdbId: params.tmdbId }, "Similar failed");
        set.status = 500;
        return { error: "Failed to get similar media" };
      }
    },
    {
      params: t.Object({
        tmdbId: t.String(),
      }),
      query: t.Object({
        type: t.Optional(t.Union([t.Literal("movie"), t.Literal("series")])),
        page: t.Optional(t.String()),
      }),
    },
  )

  /**
   * GET /media/:id/gallery
   * Returns videos, backdrops and posters from the local DB.
   * If no gallery data exists yet (new import), triggers a background sync and returns empty.
   */
  .get(
    "/:id/gallery",
    async ({ params, set }) => {
      const { mediaVideos, mediaImages } = await import("../db");

      // Verify media exists
      const [mediaRecord] = await db
        .select({ id: media.id, tmdbId: media.tmdbId, type: media.type })
        .from(media)
        .where(eq(media.id, params.id))
        .limit(1);

      if (!mediaRecord) {
        set.status = 404;
        return { error: "Media not found" };
      }

      const typeOrder = ["Trailer", "Teaser", "Clip", "Featurette", "Behind the Scenes"];

      const [videos, backdrops, posters] = await Promise.all([
        db
          .select({
            key: mediaVideos.tmdbKey,
            name: mediaVideos.name,
            type: mediaVideos.type,
            site: mediaVideos.site,
            official: mediaVideos.official,
            published_at: mediaVideos.publishedAt,
          })
          .from(mediaVideos)
          .where(eq(mediaVideos.mediaId, params.id))
          .orderBy(mediaVideos.publishedAt),
        db
          .select({
            file_path: mediaImages.filePath,
            width: mediaImages.width,
            height: mediaImages.height,
            vote_average: mediaImages.voteAverage,
          })
          .from(mediaImages)
          .where(and(eq(mediaImages.mediaId, params.id), eq(mediaImages.imageType, "backdrop")))
          .orderBy(desc(mediaImages.voteAverage))
          .limit(50),
        db
          .select({
            file_path: mediaImages.filePath,
            width: mediaImages.width,
            height: mediaImages.height,
            vote_average: mediaImages.voteAverage,
          })
          .from(mediaImages)
          .where(and(eq(mediaImages.mediaId, params.id), eq(mediaImages.imageType, "poster")))
          .orderBy(desc(mediaImages.voteAverage))
          .limit(50),
      ]);

      // If no gallery data yet, trigger background sync and return empty
      if (videos.length === 0 && backdrops.length === 0 && posters.length === 0 && mediaRecord.tmdbId) {
        import("../services/tmdb-gallery").then(({ syncMediaGallery }) => {
          syncMediaGallery(mediaRecord.id, mediaRecord.tmdbId!, mediaRecord.type as "movie" | "series")
            .catch((err) => logger.error({ err, mediaId: mediaRecord.id }, "On-demand gallery sync failed"));
        });
      }

      return {
        data: {
          videos: videos
            .sort((a, b) => {
              const aIdx = typeOrder.indexOf(a.type ?? "");
              const bIdx = typeOrder.indexOf(b.type ?? "");
              if (aIdx !== bIdx) return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
              if (a.official !== b.official) return (a.official ? -1 : 1);
              return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
            }),
          backdrops,
          posters,
        },
      };
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
    },
  )

  /**
   * GET /media/:id/reviews
   */
  .get(
    "/:id/reviews",
    async ({ params, query }) => {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(Number(query.limit) || 10, 50);
      const offset = (page - 1) * limit;
      const sortBy = query.sort || "popular";

      const { reviews } = await import("../db");

      const orderBy =
        sortBy === "popular"
          ? desc(reviews.likesCount)
          : desc(reviews.createdAt);

      const results = await db
        .select({
          review: reviews,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(reviews)
        .innerJoin(userTable, eq(reviews.userId, userTable.id))
        .where(eq(reviews.mediaId, params.id))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(reviews)
        .where(eq(reviews.mediaId, params.id));

      return {
        data: results.map((r) => ({
          ...r.review,
          user: r.user,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        sort: t.Optional(t.String()),
      }),
    },
  )

  /**
   * GET /media/:id/lists
   */
  .get(
    "/:id/lists",
    async ({ params, query }) => {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(Number(query.limit) || 6, 20);
      const offset = (page - 1) * limit;

      const { lists, listItems } = await import("../db");

      const results = await db
        .select({
          list: lists,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(listItems)
        .innerJoin(lists, eq(listItems.listId, lists.id))
        .innerJoin(userTable, eq(lists.userId, userTable.id))
        .where(and(eq(listItems.mediaId, params.id), eq(lists.isPublic, true)))
        .orderBy(desc(lists.likesCount))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(listItems)
        .innerJoin(lists, eq(listItems.listId, lists.id))
        .where(and(eq(listItems.mediaId, params.id), eq(lists.isPublic, true)));

      return {
        data: results.map((r) => ({
          ...r.list,
          user: r.user,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  );
