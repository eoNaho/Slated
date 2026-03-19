import { Elysia, t } from "elysia";
import {
  db,
  media,
  mediaGenres,
  genres,
  mediaStreaming,
  streamingServices,
  activities,
  eq,
  and,
  desc,
  asc,
  sql,
  count,
  inArray,
  gte,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";
import { storageService } from "../services/storage";

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
    const allGenres = await db
      .select({ id: genres.id, name: genres.name, slug: genres.slug })
      .from(genres)
      .orderBy(asc(genres.name));

    return { data: allGenres };
  })

  .get("/streaming", async () => {
    const services = await db
      .select({ id: streamingServices.id, name: streamingServices.name, slug: streamingServices.slug, logoPath: streamingServices.logoPath })
      .from(streamingServices)
      .orderBy(asc(streamingServices.name));

    return { data: services.map(s => ({ ...s, logoPath: resolveImageUrl(s.logoPath) })) };
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

      let results;
      if (genreId) {
        results = await db
          .select({ media })
          .from(media)
          .innerJoin(mediaGenres, eq(media.id, mediaGenres.mediaId))
          .where(and(eq(mediaGenres.genreId, genreId), ...conditions))
          .orderBy(sql`RANDOM()`)
          .limit(limit);
      } else if (streamingService) {
        results = await db
          .select({ media })
          .from(media)
          .innerJoin(mediaStreaming, eq(media.id, mediaStreaming.mediaId))
          .innerJoin(streamingServices, eq(mediaStreaming.serviceId, streamingServices.id))
          .where(and(eq(streamingServices.slug, streamingService), ...conditions))
          .orderBy(sql`RANDOM()`)
          .limit(limit);
      } else {
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        results = await db.select().from(media).where(whereClause).orderBy(sql`RANDOM()`).limit(limit);
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
  );
