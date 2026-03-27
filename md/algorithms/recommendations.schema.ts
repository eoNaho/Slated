/**
 * db/schema/recommendations.ts
 *
 * Tabelas de suporte ao sistema de recomendação.
 * Evita recalcular tudo do zero a cada request.
 *
 * Tabelas:
 *   user_taste_snapshots    → perfil calculado (gêneros, décadas, vetor)
 *   recommendation_feedback → o usuário "não gostei" / "já vi"
 *   user_similarity_cache   → par (userA, userB) → similarity score
 */

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
// Armazenado como JSON para evitar joins complexos.
// Invalidado sempre que o usuário assiste algo novo.

export const userTasteSnapshots = pgTable(
  "user_taste_snapshots",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),

    // Top gêneros como JSON: [{ genreId, genreName, score }]
    topGenres: jsonb("top_genres").notNull().default("[]"),

    // Top décadas: [{ decade, score }]
    topDecades: jsonb("top_decades").notNull().default("[]"),

    // Top idiomas: [{ language, score }]
    topLanguages: jsonb("top_languages").notNull().default("[]"),

    // Estatísticas de rating
    avgRating:     real("avg_rating").default(3.0),
    ratingStdDev:  real("rating_std_dev").default(0),

    // Vetor de gênero normalizado (para cosine similarity)
    // Armazenado como array de floats em JSON
    genreVector: jsonb("genre_vector").notNull().default("[]"),

    // Contadores
    totalWatched: integer("total_watched").default(0),
    reviewRate:   real("review_rate").default(0),

    // Nível de atividade
    activityLevel: text("activity_level").default("low"), // 'low' | 'medium' | 'high'

    // Quando foi calculado (para TTL manual)
    computedAt:  timestamp("computed_at", { withTimezone: true }).defaultNow(),
    updatedAt:   timestamp("updated_at",  { withTimezone: true }).defaultNow(),
  }
);

// ─── Feedback de recomendações ────────────────────────────────────────────────
// O usuário pode dar feedback: "não me interessa", "já vi", "adorei a sugestão"
// Usado para refinar o algoritmo e filtrar recs ruins.

export const recommendationFeedback = pgTable(
  "recommendation_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),

    // Tipo de recomendação: "media" | "user"
    recType: text("rec_type").notNull(),

    // ID do item recomendado (mediaId ou userId)
    targetId: uuid("target_id").notNull(),

    // Feedback do usuário
    // 'not_interested' | 'already_watched' | 'loved_it' | 'not_my_taste'
    feedback: text("feedback").notNull(),

    // Score de impacto no algoritmo (-1 a +1)
    // not_interested: -0.5, already_watched: 0, loved_it: +1, not_my_taste: -1
    impactScore: real("impact_score").default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_feedback").on(table.userId, table.recType, table.targetId),
    index("idx_feedback_user").on(table.userId),
    index("idx_feedback_target").on(table.recType, table.targetId),
  ]
);

// ─── Cache de similaridade entre usuários ─────────────────────────────────────
// Armazena pares (userA, userB) com o cosine similarity calculado.
// TTL: 24h — recalculado pelo job noturno.

export const userSimilarityCache = pgTable(
  "user_similarity_cache",
  {
    userIdA:    uuid("user_id_a").references(() => user.id, { onDelete: "cascade" }).notNull(),
    userIdB:    uuid("user_id_b").references(() => user.id, { onDelete: "cascade" }).notNull(),
    similarity: real("similarity").notNull(),          // 0–1
    commonMedia: integer("common_media").default(0),   // filmes em comum
    computedAt:  timestamp("computed_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userIdA, table.userIdB] }),
    index("idx_similarity_user_a").on(table.userIdA, table.similarity),
    index("idx_similarity_user_b").on(table.userIdB, table.similarity),
  ]
);

// ─── Log de impressões do feed ────────────────────────────────────────────────
// Para analytics premium: "você viu X itens, clicou em Y"

export const feedImpressions = pgTable(
  "feed_impressions",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    userId:      uuid("user_id").references(() => user.id, { onDelete: "cascade" }).notNull(),
    activityId:  uuid("activity_id").notNull(),
    score:       real("score"),         // score que o algoritmo deu
    position:    integer("position"),   // posição no feed
    clicked:     boolean("clicked").default(false),
    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_impressions_user").on(table.userId, table.createdAt),
  ]
);
