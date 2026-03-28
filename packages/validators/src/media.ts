import { Type as t } from "@sinclair/typebox";

export const SearchMediaQuery = t.Object({
  q: t.Optional(t.String()),
  type: t.Optional(t.String()),
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

export const ListMediaQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  type: t.Optional(t.String()),
  genre: t.Optional(t.String()),
  year: t.Optional(t.String()),
  q: t.Optional(t.String()),
  sortBy: t.Optional(t.String()),
  sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
});

export const DiscoverMediaQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  type: t.Optional(t.String()),
  genre: t.Optional(t.String()),
  year: t.Optional(t.String()),
  yearFrom: t.Optional(t.String()),
  yearTo: t.Optional(t.String()),
  ratingMin: t.Optional(t.String()),
  ratingMax: t.Optional(t.String()),
  sortBy: t.Optional(t.String()),
  sortOrder: t.Optional(t.String()),
  streaming: t.Optional(t.String()),
  language: t.Optional(t.String()),
});

export const MediaSlugParam = t.Object({ slug: t.String() });

export const TmdbIdParam = t.Object({ tmdbId: t.String() });

export const TrendingQuery = t.Object({
  timeWindow: t.Optional(t.Union([t.Literal("day"), t.Literal("week")])),
  type: t.Optional(t.Union([t.Literal("movie"), t.Literal("series"), t.Literal("all")])),
  page: t.Optional(t.String()),
});

export const MediaTypePageQuery = t.Object({
  type: t.Optional(t.Union([t.Literal("movie"), t.Literal("series")])),
  page: t.Optional(t.String()),
});

export const MediaTypeQuery = t.Object({
  type: t.Union([t.Literal("movie"), t.Literal("series")]),
});

export const ImportMediaBody = t.Object({
  tmdbId: t.Number(),
  type: t.Union([t.Literal("movie"), t.Literal("series")]),
});

export const BatchImportBody = t.Object({
  items: t.Array(
    t.Object({
      tmdbId: t.Number(),
      type: t.Union([t.Literal("movie"), t.Literal("series")]),
    })
  ),
});

export const MediaReviewsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  sort: t.Optional(t.String()),
});

// Discover sub-queries

export const DiscoverFiltersQuery = t.Object({
  period: t.Optional(t.String()),
  type: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

export const DiscoverStreamingQuery = t.Object({
  limit: t.Optional(t.String()),
  genre: t.Optional(t.String()),
  year: t.Optional(t.String()),
  type: t.Optional(t.String()),
  streaming: t.Optional(t.String()),
});

export const DiscoverTypeLimitQuery = t.Object({
  type: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

// Series-specific

export const SeriesIdParam = t.Object({ id: t.String() });

export const SeriesSeasonParams = t.Object({
  id: t.String(),
  seasonNumber: t.String(),
});

export const SeriesEpisodeParams = t.Object({
  id: t.String(),
  seasonNumber: t.String(),
  episodeNumber: t.String(),
});

export const SeriesEpisodeIdParams = t.Object({
  id: t.String(),
  episodeId: t.String(),
});

export const EpisodeProgressBody = t.Object({
  progress: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
  isWatched: t.Optional(t.Boolean()),
  watchedAt: t.Optional(t.String()),
});

export const SeasonProgressBody = t.Object({
  progress: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
  isWatched: t.Optional(t.Boolean()),
});

// Episode watch body (rating + notes)
export const EpisodeWatchBody = t.Object({
  rating: t.Optional(t.Number({ minimum: 0.5, maximum: 5 })),
  notes: t.Optional(t.String({ maxLength: 500 })),
});

// Season rate body
export const SeasonRateBody = t.Object({
  rating: t.Number({ minimum: 0.5, maximum: 5 }),
  notes: t.Optional(t.String()),
});

export const GalleryImageBody = t.Object({ filePath: t.String() });
