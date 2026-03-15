import {
  pgTable,
  uuid,
  real,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { media } from "./media";

// ============================================================================
// Ratings (separado de reviews)
// ============================================================================

/**
 * Ratings sem review - usuário pode dar nota sem escrever texto
 * Similar ao "quick rating" do Letterboxd
 */
export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    rating: real("rating").notNull(), // 0.5 - 5.0 (incrementos de 0.5)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_user_media_rating").on(table.userId, table.mediaId),
    index("idx_ratings_user").on(table.userId),
    index("idx_ratings_media").on(table.mediaId),
    index("idx_ratings_value").on(table.rating),
  ]
);

// ============================================================================
// Favorites (top 4 do perfil)
// ============================================================================

/**
 * Filmes favoritos destacados no perfil
 * Limite de 4 por padrão (premium pode ter mais)
 */
export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    position: integer("position").notNull(), // 1, 2, 3, 4
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_user_favorite").on(table.userId, table.mediaId),
    unique("unique_user_favorite_position").on(table.userId, table.position),
    index("idx_favorites_user").on(table.userId),
  ]
);
