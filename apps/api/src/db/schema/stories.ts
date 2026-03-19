import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  index,
  unique,
  primaryKey,
  jsonb,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Stories
export const stories = pgTable(
  "stories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type").notNull(), // 'watch' | 'list' | 'rating' | 'poll' | 'hot_take' | 'rewind'
    content: jsonb("content").notNull(),
    imageUrl: text("image_url"),
    isPinned: boolean("is_pinned").default(false),
    isExpired: boolean("is_expired").default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    viewsCount: integer("views_count").default(0),
    reactionsCount: integer("reactions_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_stories_user").on(table.userId, table.expiresAt),
    index("idx_stories_feed").on(table.isExpired, table.expiresAt),
    index("idx_stories_created").on(table.createdAt),
  ]
);

// Story Views
export const storyViews = pgTable(
  "story_views",
  {
    storyId: uuid("story_id")
      .references(() => stories.id, { onDelete: "cascade" })
      .notNull(),
    viewerId: uuid("viewer_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.storyId, table.viewerId] }),
    index("idx_story_views_story").on(table.storyId),
  ]
);

// Story Reactions
export const storyReactions = pgTable(
  "story_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .references(() => stories.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    reaction: text("reaction").notNull(), // 'agree' | 'disagree' | emoji string
    textReply: text("text_reply"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_story_reaction").on(table.storyId, table.userId),
    index("idx_story_reactions_story").on(table.storyId),
  ]
);

// Story Poll Votes
export const storyPollVotes = pgTable(
  "story_poll_votes",
  {
    storyId: uuid("story_id")
      .references(() => stories.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    optionIndex: integer("option_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.storyId, table.userId] }),
    index("idx_story_poll_votes_story").on(table.storyId),
  ]
);
