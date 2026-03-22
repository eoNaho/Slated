import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  unique,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth-schema";

// Close Friends (for story visibility)
export const closeFriends = pgTable(
  "close_friends",
  {
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    friendId: uuid("friend_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.friendId] }),
    index("idx_close_friends_user").on(table.userId),
    check("no_self_close_friend", sql`${table.userId} != ${table.friendId}`),
  ]
);

// Follows
export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    followingId: uuid("following_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    index("idx_follows_follower").on(table.followerId),
    index("idx_follows_following").on(table.followingId),
    check("no_self_follow", sql`${table.followerId} != ${table.followingId}`),
  ]
);

// Likes
export const likes = pgTable(
  "likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    targetType: text("target_type").notNull(), // 'media' | 'review' | 'list'
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_user_like").on(
      table.userId,
      table.targetType,
      table.targetId
    ),
    index("idx_likes_user").on(table.userId),
    index("idx_likes_target").on(table.targetType, table.targetId),
  ]
);

// Comments
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    targetType: text("target_type").notNull(), // 'review' | 'list'
    targetId: uuid("target_id").notNull(),
    parentId: uuid("parent_id"),
    content: text("content").notNull(),
    likesCount: integer("likes_count").default(0),
    isHidden: boolean("is_hidden").default(false),
    hiddenReason: text("hidden_reason"),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    hiddenBy: uuid("hidden_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_comments_target").on(table.targetType, table.targetId),
    index("idx_comments_parent").on(table.parentId),
  ]
);

// Activities
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type").notNull(), // 'watched' | 'review' | 'rating' | 'list' | 'like' | 'follow' | 'achievement'
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    metadata: text("metadata"), // JSON string
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_activities_user").on(table.userId),
    index("idx_activities_created").on(table.createdAt),
  ]
);
