import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  real,
  date,
  timestamp,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";

// Enums
export const mediaTypeEnum = pgEnum("media_type", ["movie", "series"]);
export const mediaStatusEnum = pgEnum("media_status", [
  "released",
  "upcoming",
  "in_production",
  "canceled",
  "ended", // TV series that ended
  "returning", // TV series returning for more seasons
  "pilot", // TV series in pilot phase
  "planned", // Planned production
  "post_production", // In post-production
  "rumored", // Rumored
]);
export const genderTypeEnum = pgEnum("gender_type", [
  "male",
  "female",
  "non_binary",
  "unknown",
]);

// Media table
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tmdbId: integer("tmdb_id").unique().notNull(),
    imdbId: text("imdb_id"),
    slug: text("slug").unique().notNull(),
    type: mediaTypeEnum("type").notNull(),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    tagline: text("tagline"),
    overview: text("overview"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    releaseDate: date("release_date"),
    runtime: integer("runtime"),
    budget: bigint("budget", { mode: "number" }),
    revenue: bigint("revenue", { mode: "number" }),
    popularity: real("popularity").default(0),
    voteAverage: real("vote_average").default(0),
    voteCount: integer("vote_count").default(0),
    status: mediaStatusEnum("status").default("released"),
    originalLanguage: text("original_language").default("en"),
    seasonsCount: integer("seasons_count"),
    episodesCount: integer("episodes_count"),
    homepage: text("homepage"),
    trailerUrl: text("trailer_url"),
    // External Ratings
    imdbRating: real("imdb_rating"),
    imdbVotes: integer("imdb_votes"),
    metacriticScore: integer("metacritic_score"),
    rottenTomatoesScore: integer("rotten_tomatoes_score"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_media_tmdb_id").on(table.tmdbId),
    index("idx_media_slug").on(table.slug),
    index("idx_media_type").on(table.type),
    index("idx_media_release_date").on(table.releaseDate),
    index("idx_media_popularity").on(table.popularity),
    index("idx_media_imdb_rating").on(table.imdbRating),
    index("idx_media_metacritic_score").on(table.metacriticScore),
  ]
);

// Genres
export const genres = pgTable("genres", {
  id: uuid("id").primaryKey().defaultRandom(),
  tmdbId: integer("tmdb_id").unique(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
});

// Media-Genres junction
export const mediaGenres = pgTable(
  "media_genres",
  {
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    genreId: uuid("genre_id")
      .references(() => genres.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    index("idx_media_genres_media").on(table.mediaId),
    unique("media_genres_unique").on(table.mediaId, table.genreId),
  ]
);

// People (Cast & Crew)
export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tmdbId: integer("tmdb_id").unique().notNull(),
    imdbId: text("imdb_id"),
    name: text("name").notNull(),
    slug: text("slug").unique().notNull(),
    biography: text("biography"),
    birthday: date("birthday"),
    deathday: date("deathday"),
    birthPlace: text("birth_place"),
    profilePath: text("profile_path"),
    gender: genderTypeEnum("gender").default("unknown"),
    popularity: real("popularity").default(0),
    knownForDepartment: text("known_for_department"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_people_tmdb_id").on(table.tmdbId),
    index("idx_people_slug").on(table.slug),
  ]
);

// Media Credits
export const mediaCredits = pgTable(
  "media_credits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    personId: uuid("person_id")
      .references(() => people.id, { onDelete: "cascade" })
      .notNull(),
    creditType: text("credit_type").notNull(), // 'cast' | 'crew'
    character: text("character"),
    castOrder: integer("cast_order"),
    department: text("department"),
    job: text("job"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_credits_media").on(table.mediaId),
    index("idx_credits_person").on(table.personId),
    unique("media_credits_unique").on(
      table.mediaId,
      table.personId,
      table.creditType
    ),
  ]
);
