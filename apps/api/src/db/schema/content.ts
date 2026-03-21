import {
  pgTable,
  uuid,
  text,
  real,
  boolean,
  integer,
  date,
  timestamp,
  index,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth-schema";
import { media } from "./media";
import { seasons, episodes } from "./series";

// Reviews
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    // Optional targeting for series sub-reviews
    seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id").references(() => episodes.id, { onDelete: "cascade" }),
    // 'manual' = user wrote it directly; 'diary' = auto-created from a diary log note
    source: text("source").notNull().default("manual"),
    title: text("title"),
    content: text("content").notNull(),
    rating: real("rating"),
    containsSpoilers: boolean("contains_spoilers").default(false),
    likesCount: integer("likes_count").default(0),
    commentsCount: integer("comments_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Partial unique indexes — one review per user per scope
    uniqueIndex("idx_review_unique_media").on(table.userId, table.mediaId)
      .where(sql`${table.seasonId} IS NULL AND ${table.episodeId} IS NULL`),
    uniqueIndex("idx_review_unique_season").on(table.userId, table.seasonId)
      .where(sql`${table.seasonId} IS NOT NULL AND ${table.episodeId} IS NULL`),
    uniqueIndex("idx_review_unique_episode").on(table.userId, table.episodeId)
      .where(sql`${table.episodeId} IS NOT NULL`),
    index("idx_reviews_user").on(table.userId),
    index("idx_reviews_media").on(table.mediaId),
    index("idx_reviews_season").on(table.seasonId),
    index("idx_reviews_episode").on(table.episodeId),
    index("idx_reviews_created").on(table.createdAt),
  ]
);

// Lists
export const lists = pgTable(
  "lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    isPublic: boolean("is_public").default(true),
    isRanked: boolean("is_ranked").default(false),
    isThematic: boolean("is_thematic").default(false),
    category: text("category"),
    likesCount: integer("likes_count").default(0),
    itemsCount: integer("items_count").default(0),
    viewsCount: integer("views_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_lists_user").on(table.userId),
    unique("unique_user_list_slug").on(table.userId, table.slug),
  ]
);

// List Items
export const listItems = pgTable(
  "list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .references(() => lists.id, { onDelete: "cascade" })
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    position: integer("position").default(0),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_list_media").on(table.listId, table.mediaId),
    index("idx_list_items_list").on(table.listId),
  ]
);

// Watchlist
export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    priority: text("priority").default("medium"), // 'low' | 'medium' | 'high'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_user_watchlist").on(table.userId, table.mediaId),
    index("idx_watchlist_user").on(table.userId),
  ]
);

// Diary
export const diary = pgTable(
  "diary",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    reviewId: uuid("review_id").references(() => reviews.id, {
      onDelete: "set null",
    }),
    watchedAt: date("watched_at").notNull().defaultNow(),
    rating: real("rating"),
    isRewatch: boolean("is_rewatch").default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_diary_user").on(table.userId),
    index("idx_diary_watched_at").on(table.watchedAt),
  ]
);
