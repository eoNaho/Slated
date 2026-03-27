import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  boolean,
  timestamp,
  index,
  unique,
  primaryKey,
  jsonb,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// ─── Snapshot do perfil de gosto ─────────────────────────────────────────────

export const userTasteSnapshots = pgTable("user_taste_snapshots", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  topGenres: jsonb("top_genres").notNull().default("[]"),
  topDecades: jsonb("top_decades").notNull().default("[]"),
  topLanguages: jsonb("top_languages").notNull().default("[]"),
  avgRating: real("avg_rating").default(3.0),
  ratingStdDev: real("rating_std_dev").default(0),
  genreVector: jsonb("genre_vector").notNull().default("[]"),
  totalWatched: integer("total_watched").default(0),
  reviewRate: real("review_rate").default(0),
  activityLevel: text("activity_level").default("low"),
  // Expanded columns
  diversityScore: real("diversity_score").default(0),
  mainstreamScore: real("mainstream_score").default(0),
  preferredRuntime: integer("preferred_runtime"),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Feedback de recomendações ────────────────────────────────────────────────

export const recommendationFeedback = pgTable(
  "recommendation_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    recType: text("rec_type").notNull(),
    targetId: uuid("target_id").notNull(),
    feedback: text("feedback").notNull(),
    impactScore: real("impact_score").default(0),
    // Expanded columns
    source: text("source"),
    context: text("context"),
    convertedToWatch: boolean("converted_to_watch").default(false),
    convertedToFollow: boolean("converted_to_follow").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_feedback").on(table.userId, table.recType, table.targetId),
    index("idx_feedback_user").on(table.userId),
    index("idx_feedback_target").on(table.recType, table.targetId),
  ]
);

// ─── Cache de similaridade entre usuários ─────────────────────────────────────

export const userSimilarityCache = pgTable(
  "user_similarity_cache",
  {
    userIdA: uuid("user_id_a")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    userIdB: uuid("user_id_b")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    similarity: real("similarity").notNull(),
    commonMedia: integer("common_media").default(0),
    computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userIdA, table.userIdB] }),
    index("idx_similarity_user_a").on(table.userIdA, table.similarity),
    index("idx_similarity_user_b").on(table.userIdB, table.similarity),
  ]
);

// ─── Log de impressões do feed ────────────────────────────────────────────────

export const feedImpressions = pgTable(
  "feed_impressions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    activityId: uuid("activity_id").notNull(),
    score: real("score"),
    position: integer("position"),
    clicked: boolean("clicked").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_impressions_user").on(table.userId, table.createdAt)]
);

// ─── Preferências de onboarding ───────────────────────────────────────────────

export const userOnboardingPreferences = pgTable(
  "user_onboarding_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    selectedGenreIds: jsonb("selected_genre_ids").notNull().default("[]"),
    seedMediaIds: jsonb("seed_media_ids").notNull().default("[]"),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  }
);

// ─── Explicações de recomendações ("because you watched X") ───────────────────

export const recommendationExplanations = pgTable(
  "recommendation_explanations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    targetMediaId: uuid("target_media_id").notNull(),
    sourceMediaId: uuid("source_media_id"),
    sourceUserId: uuid("source_user_id"),
    explanationType: text("explanation_type").notNull(),
    explanationText: text("explanation_text").notNull(),
    score: real("score"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_explanations_user_target").on(table.userId, table.targetMediaId),
    index("idx_explanations_user_date").on(table.userId, table.createdAt),
  ]
);

// ─── Batches pré-computados de recomendações ──────────────────────────────────

export const recommendationBatches = pgTable(
  "recommendation_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    batchType: text("batch_type").notNull(),
    items: jsonb("items").notNull().default("[]"),
    parameters: jsonb("parameters").notNull().default("{}"),
    computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_batches_user_type").on(
      table.userId,
      table.batchType,
      table.expiresAt
    ),
  ]
);
