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
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { media } from "./media";

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
    unique("unique_user_media_review").on(table.userId, table.mediaId),
    index("idx_reviews_user").on(table.userId),
    index("idx_reviews_media").on(table.mediaId),
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
  (table) => [index("idx_lists_user").on(table.userId)]
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
