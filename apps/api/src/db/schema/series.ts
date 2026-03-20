import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  date,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { media } from "./media";
import { user } from "./auth-schema";

// ============================================================================
// Seasons
// ============================================================================

/**
 * Temporadas de séries
 * Sincronizado do TMDB
 */
export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    seasonNumber: integer("season_number").notNull(),
    name: text("name"),
    overview: text("overview"),
    posterPath: text("poster_path"),
    airDate: date("air_date"),
    episodeCount: integer("episode_count").default(0),
    /** Cached average of all episode ratings for this season */
    averageEpisodeRating: real("average_episode_rating"),
    /** Last time seasons/episodes were synced from TMDB */
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_media_season").on(table.mediaId, table.seasonNumber),
    index("idx_seasons_media").on(table.mediaId),
    index("idx_seasons_tmdb").on(table.tmdbId),
  ]
);

// ============================================================================
// Episodes
// ============================================================================

/**
 * Episódios de séries
 * Sincronizado do TMDB
 */
export const episodes = pgTable(
  "episodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .references(() => seasons.id, { onDelete: "cascade" })
      .notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    episodeNumber: integer("episode_number").notNull(),
    name: text("name"),
    overview: text("overview"),
    stillPath: text("still_path"), // Screenshot do episódio
    airDate: date("air_date"),
    runtime: integer("runtime"), // Em minutos
    voteAverage: real("vote_average"),
    voteCount: integer("vote_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_season_episode").on(table.seasonId, table.episodeNumber),
    index("idx_episodes_season").on(table.seasonId),
    index("idx_episodes_tmdb").on(table.tmdbId),
    index("idx_episodes_air_date").on(table.airDate),
  ]
);

// ============================================================================
// Episode Progress (tracking do usuário)
// ============================================================================

/**
 * Progresso de episódios por usuário
 * Permite marcar episódios como assistidos + dar rating individual
 */
export const episodeProgress = pgTable(
  "episode_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    episodeId: uuid("episode_id")
      .references(() => episodes.id, { onDelete: "cascade" })
      .notNull(),
    watchedAt: timestamp("watched_at", { withTimezone: true }).defaultNow(),
    rating: real("rating"), // Opcional: 0.5 - 5.0
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_user_episode").on(table.userId, table.episodeId),
    index("idx_episode_progress_user").on(table.userId),
    index("idx_episode_progress_episode").on(table.episodeId),
    index("idx_episode_progress_watched").on(table.watchedAt),
  ]
);

// ============================================================================
// Season Ratings (rating por temporada)
// ============================================================================

/**
 * Rating por temporada — separado do rating geral da série.
 *
 * source:
 *   "manual" — usuário definiu explicitamente
 *   "auto"   — calculado como média dos ratings de episódios
 *
 * Regra: rating manual NUNCA é sobrescrito pelo auto.
 * Deletar o manual reabilita o auto.
 */
export const seasonRatings = pgTable(
  "season_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    seasonId: uuid("season_id")
      .references(() => seasons.id, { onDelete: "cascade" })
      .notNull(),
    rating: real("rating").notNull(),
    /** "manual" = user set explicitly; "auto" = calculated from episode avg */
    isManual: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_user_season_rating").on(table.userId, table.seasonId),
    index("idx_season_ratings_user").on(table.userId),
    index("idx_season_ratings_season").on(table.seasonId),
  ]
);

