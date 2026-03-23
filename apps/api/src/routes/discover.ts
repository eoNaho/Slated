import { Elysia, t } from "elysia";
import {
  db,
  media,
  mediaGenres,
  genres,
  mediaStreaming,
  streamingServices,
  activities,
  reviews,
  lists,
  eq,
  and,
  desc,
  asc,
  sql,
  count,
  inArray,
  gte,
} from "../db";
import { betterAuthPlugin, getOptionalSession } from "../lib/auth";
import { storageService } from "../services/storage";
import { cached, TTL } from "../lib/cache";
import { metadataService } from "../services/metadata.service";
import { scrobbles, diary } from "../db/schema";

// Helper to resolve image URLs
function resolveImageUrl(path: string | null): string | null {
  if (!path) return null;
  return storageService.getImageUrl(path);
}

export const discoverRoutes = new Elysia({ prefix: "/discover", tags: ["Media"] })
  .use(betterAuthPlugin)

  // ==========================================================================
  // Discover with filters
  // ==========================================================================

  .get(
    "/",
    async ({ query }: any) => {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const genreId = query.genre;
      const year = query.year ? Number(query.year) : undefined;
      const yearFrom = query.yearFrom ? Number(query.yearFrom) : undefined;
      const yearTo = query.yearTo ? Number(query.yearTo) : undefined;
      const type = query.type as "movie" | "series" | undefined;
      const ratingMin = query.ratingMin ? Number(query.ratingMin) : undefined;
      const ratingMax = query.ratingMax ? Number(query.ratingMax) : undefined;
      const sortBy = query.sortBy || "popularity";
      const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
      const streamingService = query.streaming;
      const language = query.language;

      const conditions = [];

      if (type) conditions.push(eq(media.type, type));
      if (year) conditions.push(sql`EXTRACT(YEAR FROM ${media.releaseDate}) = ${year}`);
      if (yearFrom) conditions.push(sql`EXTRACT(YEAR FROM ${media.releaseDate}) >= ${yearFrom}`);
      if (yearTo) conditions.push(sql`EXTRACT(YEAR FROM ${media.releaseDate}) <= ${yearTo}`);
      if (ratingMin) conditions.push(sql`${media.voteAverage} >= ${ratingMin}`);
      if (ratingMax) conditions.push(sql`${media.voteAverage} <= ${ratingMax}`);
      if (language) conditions.push(eq(media.originalLanguage, language));

      let orderByClause;
      switch (sortBy) {
        case "rating":
          orderByClause = sortOrder === "asc" ? asc(media.voteAverage) : desc(media.voteAverage);
          break;
        case "releaseDate":
          orderByClause = sortOrder === "asc" ? asc(media.releaseDate) : desc(media.releaseDate);
          break;
        case "title":
          orderByClause = sortOrder === "asc" ? asc(media.title) : desc(media.title);
          break;
        case "popularity":
        default:
          orderByClause = sortOrder === "asc" ? asc(media.popularity) : desc(media.popularity);
      }

      let results;
      let total;

      if (genreId) {
        results = await db
          .select({ media })
          .from(media)
          .innerJoin(mediaGenres, eq(media.id, mediaGenres.mediaId))
          .where(and(eq(mediaGenres.genreId, genreId), ...conditions))
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset);

        const [countResult] = await db
          .select({ total: count() })
          .from(media)
          .innerJoin(mediaGenres, eq(media.id, mediaGenres.mediaId))
          .where(and(eq(mediaGenres.genreId, genreId), ...conditions));
        total = countResult.total;
      } else if (streamingService) {
        results = await db
          .select({ media })
          .from(media)
          .innerJoin(mediaStreaming, eq(media.id, mediaStreaming.mediaId))
          .innerJoin(streamingServices, eq(mediaStreaming.serviceId, streamingServices.id))
          .where(and(eq(streamingServices.slug, streamingService), ...conditions))
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset);

        const [countResult] = await db
          .select({ total: count() })
          .from(media)
          .innerJoin(mediaStreaming, eq(media.id, mediaStreaming.mediaId))
          .innerJoin(streamingServices, eq(mediaStreaming.serviceId, streamingServices.id))
          .where(and(eq(streamingServices.slug, streamingService), ...conditions));
        total = countResult.total;
      } else {
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        results = await db.select().from(media).where(whereClause).orderBy(orderByClause).limit(limit).offset(offset);

        const [countResult] = await db.select({ total: count() }).from(media).where(whereClause);
        total = countResult.total;
      }

      const data = results.map((r) => {
        const item = "media" in r ? r.media : r;
        return {
          ...item,
          posterPath: resolveImageUrl(item.posterPath),
          backdropPath: resolveImageUrl(item.backdropPath),
        };
      });

      return {
        data,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
        filters: { genre: genreId, year, yearFrom, yearTo, type, ratingMin, ratingMax, sortBy, sortOrder, streaming: streamingService, language },
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        genre: t.Optional(t.String()),
        year: t.Optional(t.String()),
        yearFrom: t.Optional(t.String()),
        yearTo: t.Optional(t.String()),
        type: t.Optional(t.String()),
        ratingMin: t.Optional(t.String()),
        ratingMax: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
        streaming: t.Optional(t.String()),
        language: t.Optional(t.String()),
      }),
    }
  )

  // ==========================================================================
  // Get all genres (for filter UI)
  // ==========================================================================

  .get("/genres", async () => {
    return cached("genres:list", TTL.STATIC, async () => {
      const allGenres = await db
        .select({ id: genres.id, name: genres.name, slug: genres.slug })
        .from(genres)
        .orderBy(asc(genres.name));
      return { data: allGenres };
    });
  })

  .get("/streaming", async () => {
    return cached("streaming:list", TTL.STATIC, async () => {
      const services = await db
        .select({ id: streamingServices.id, name: streamingServices.name, slug: streamingServices.slug, logoPath: streamingServices.logoPath })
        .from(streamingServices)
        .orderBy(asc(streamingServices.name));
      return { data: services.map((s) => ({ ...s, logoPath: resolveImageUrl(s.logoPath) })) };
    });
  })

  // ==========================================================================
  // Get popular (based on recent activity in DB)
  // ==========================================================================

  .get(
    "/popular",
    async ({ query }: any) => {
      const period = query.period || "week"; // week | month | year | all
      const type = query.type as "movie" | "series" | undefined;
      const limit = Math.min(Number(query.limit) || 20, 50);

      const cacheKey = `popular:${period}:${type ?? "all"}:${limit}`;
      return cached(cacheKey, TTL.EXPENSIVE, async () => {
        const now = new Date();
        let dateFilter: Date | null = null;

        switch (period) {
          case "week":
            dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "year":
            dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            dateFilter = null;
        }

        // Calculate popular based on recent activity (diary, reviews, watchlist logs)
        const activityConditions = [eq(activities.targetType, "media")];
        if (dateFilter) activityConditions.push(gte(activities.createdAt, dateFilter));

        const popularEntries = await db
          .select({ mediaId: activities.targetId, total: count() })
          .from(activities)
          .where(and(...activityConditions))
          .groupBy(activities.targetId)
          .orderBy(desc(count()))
          .limit(limit);

        const popularIds = popularEntries
          .map((r) => r.mediaId)
          .filter((id): id is string => id !== null);

        let results;
        if (popularIds.length > 0) {
          const typeCondition = type ? [eq(media.type, type)] : [];
          results = await db
            .select()
            .from(media)
            .where(and(inArray(media.id, popularIds), ...typeCondition));

          // Preserve the activity-based order
          const orderMap = new Map(popularIds.map((id, i) => [id, i]));
          results.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
        } else {
          // Fallback to popularity field if no activity data
          const whereClause = type ? eq(media.type, type) : undefined;
          results = await db
            .select()
            .from(media)
            .where(whereClause)
            .orderBy(desc(media.popularity))
            .limit(limit);
        }

        return {
          data: results.map((item) => ({
            ...item,
            posterPath: resolveImageUrl(item.posterPath),
            backdropPath: resolveImageUrl(item.backdropPath),
          })),
          period,
        };
      });
    },
    {
      query: t.Object({
        period: t.Optional(t.String()),
        type: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  .get(
    "/random",
    async ({ query }: any) => {
      const limit = Math.min(Number(query.limit) || 1, 10);
      const genreId = query.genre;
      const year = query.year ? Number(query.year) : undefined;
      const type = query.type as "movie" | "series" | undefined;
      const streamingService = query.streaming;

      const conditions = [];
      if (type) conditions.push(eq(media.type, type));
      if (year) conditions.push(sql`EXTRACT(YEAR FROM ${media.releaseDate}) = ${year}`);

      // Avoid ORDER BY RANDOM() full-table sort — use random offset instead
      let results;
      if (genreId) {
        const whereClause = and(eq(mediaGenres.genreId, genreId), ...conditions);
        const [{ n }] = await db
          .select({ n: count() })
          .from(media)
          .innerJoin(mediaGenres, eq(media.id, mediaGenres.mediaId))
          .where(whereClause);
        const randomOffset = Number(n) > limit ? Math.floor(Math.random() * (Number(n) - limit)) : 0;
        results = await db
          .select({ media })
          .from(media)
          .innerJoin(mediaGenres, eq(media.id, mediaGenres.mediaId))
          .where(whereClause)
          .limit(limit)
          .offset(randomOffset);
      } else if (streamingService) {
        const whereClause = and(eq(streamingServices.slug, streamingService), ...conditions);
        const [{ n }] = await db
          .select({ n: count() })
          .from(media)
          .innerJoin(mediaStreaming, eq(media.id, mediaStreaming.mediaId))
          .innerJoin(streamingServices, eq(mediaStreaming.serviceId, streamingServices.id))
          .where(whereClause);
        const randomOffset = Number(n) > limit ? Math.floor(Math.random() * (Number(n) - limit)) : 0;
        results = await db
          .select({ media })
          .from(media)
          .innerJoin(mediaStreaming, eq(media.id, mediaStreaming.mediaId))
          .innerJoin(streamingServices, eq(mediaStreaming.serviceId, streamingServices.id))
          .where(whereClause)
          .limit(limit)
          .offset(randomOffset);
      } else {
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const [{ n }] = await db.select({ n: count() }).from(media).where(whereClause);
        const randomOffset = Number(n) > limit ? Math.floor(Math.random() * (Number(n) - limit)) : 0;
        results = await db.select().from(media).where(whereClause).limit(limit).offset(randomOffset);
      }

      const data = results.map((r) => {
        const item = "media" in r ? r.media : r;
        return {
          ...item,
          posterPath: resolveImageUrl(item.posterPath),
          backdropPath: resolveImageUrl(item.backdropPath),
        };
      });

      return { data };
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
        genre: t.Optional(t.String()),
        year: t.Optional(t.String()),
        type: t.Optional(t.String()),
        streaming: t.Optional(t.String()),
      }),
    }
  )

  // ==========================================================================
  // Trending — time-decay scoring (half-life = 48 hours)
  // Returns top media, reviews, and lists scored by recency-weighted activity
  // ==========================================================================

  .get(
    "/trending",
    async ({ query }: any) => {
      const type = query.type as "movie" | "series" | undefined;
      const limit = Math.min(Number(query.limit) || 10, 30);

      const cacheKey = `trending:${type ?? "all"}:${limit}`;
      return cached(cacheKey, TTL.EXPENSIVE, async () => {
        // Time-decay score: sum(1 / (1 + age_hours / 48)) for each activity in the last 7 days
        const trendingMediaQuery = await db.execute(sql`
          SELECT
            target_id AS media_id,
            SUM(1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0 / 48.0)) AS score
          FROM activities
          WHERE created_at > NOW() - INTERVAL '7 days'
            AND target_type = 'media'
          GROUP BY target_id
          ORDER BY score DESC
          LIMIT ${limit * 2}
        `);

        const trendingMediaIds = (trendingMediaQuery as unknown as { media_id: string; score: string }[])
          .map((r) => r.media_id)
          .filter(Boolean);

        let trendingMedia: typeof media.$inferSelect[] = [];
        if (trendingMediaIds.length > 0) {
          const typeConditions = type ? [eq(media.type, type)] : [];
          trendingMedia = await db
            .select()
            .from(media)
            .where(and(inArray(media.id, trendingMediaIds), ...typeConditions))
            .limit(limit);

          // Preserve score-based order
          const orderMap = new Map(trendingMediaIds.map((id, i) => [id, i]));
          trendingMedia.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
        }

        // Trending reviews: score = likesCount * 2 + commentsCount * 3, created in last 7 days
        const trendingReviews = await db
          .select()
          .from(reviews)
          .where(
            and(
              gte(reviews.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
              sql`${reviews.isHidden} = false`
            )
          )
          .orderBy(
            desc(sql`${reviews.likesCount} * 2 + ${reviews.commentsCount} * 3`)
          )
          .limit(limit);

        // Trending lists: score by likesCount and itemCount
        const trendingLists = await db
          .select()
          .from(lists)
          .where(
            and(
              gte(lists.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
              eq(lists.isPublic, true)
            )
          )
          .orderBy(
            desc(sql`${lists.likesCount} * 2 + ${lists.itemsCount}`)
          )
          .limit(limit);

        return {
          media: trendingMedia.map((item) => ({
            ...item,
            posterPath: resolveImageUrl(item.posterPath),
            backdropPath: resolveImageUrl(item.backdropPath),
          })),
          reviews: trendingReviews,
          lists: trendingLists,
        };
      });
    },
    {
      query: t.Object({
        type: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // ==========================================================================
  // Recommended — based on user's recent highly rated or scrobbled items
  // ==========================================================================

  .get(
    "/recommended",
    async (ctx: any) => {
      const { user, query } = ctx;
      const type = query.type as "movie" | "series" | "all" | undefined;
      const limit = Math.min(Number(query.limit) || 15, 20);

      const cacheKey = `recommended:${user.id}:${type ?? "all"}:${limit}`;
      return cached(cacheKey, TTL.VOLATILE, async () => {
        // Find most recent scrobble with tmdbId
        const [recentScrobble] = await db
          .select({ tmdbId: scrobbles.tmdbId, mediaType: scrobbles.mediaType })
          .from(scrobbles)
          .where(
            and(
              eq(scrobbles.userId, user.id),
              sql`${scrobbles.tmdbId} IS NOT NULL`
            )
          )
          .orderBy(desc(scrobbles.watchedAt))
          .limit(1);

        // Find most recent highly rated diary entry (rating >= 3.5 or 7/10)
        // Wait, diary might not have tmdbId if not joined with media. Let's just use scrobbles to guarantee tmdbId,
        // or join diary with media to get tmdbId.
        const [recentDiary] = await db
          .select({ tmdbId: media.tmdbId, mediaType: media.type })
          .from(diary)
          .innerJoin(media, eq(diary.mediaId, media.id))
          .where(
            and(
              eq(diary.userId, user.id),
              sql`${diary.rating} >= 3.5`,
              sql`${media.tmdbId} IS NOT NULL`
            )
          )
          .orderBy(desc(diary.watchedAt))
          .limit(1);

        const target = recentDiary || recentScrobble;

        if (!target?.tmdbId) {
          return { data: [] }; // No baseline to recommend from
        }

        try {
          const targetMediaType = target.mediaType === "series" ? "series" : "movie";
          const recsRes = await metadataService.getRecommendations(
            target.tmdbId,
            targetMediaType,
            1
          );

          // We only need the top N
          const mapped = recsRes.results.slice(0, limit).map((t) => ({
            id: String(t.tmdbId), // Mock an ID for the UI if not in our DB
            tmdbId: t.tmdbId,
            type: t.mediaType,
            title: t.title,
            posterPath: t.posterPath,
            backdropPath: t.backdropPath,
            releaseDate: t.releaseDate,
            voteAverage: t.voteAverage,
            overview: t.overview,
          }));

          return {
            data: mapped,
            basedOn: {
              tmdbId: target.tmdbId,
              mediaType: targetMediaType,
            },
          };
        } catch (e) {
          return { data: [] }; // Fail gracefully
        }
      });
    },
    {
      requireAuth: true,
      query: t.Object({
        type: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  );

