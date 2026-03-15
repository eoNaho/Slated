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
