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
    type: text("type").notNull(), // 'watch' | 'list' | 'rating' | 'poll' | 'hot_take' | 'rewind' | 'countdown' | 'quiz' | 'question_box'
    content: jsonb("content").notNull(),
    imageUrl: text("image_url"),
    isPinned: boolean("is_pinned").default(false),
    isExpired: boolean("is_expired").default(false),
    isArchived: boolean("is_archived").default(false),
    visibility: text("visibility").default("public"), // 'public' | 'followers' | 'close_friends'
    slides: jsonb("slides"), // StorySlide[] | null — for multi-slide stories
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    viewsCount: integer("views_count").default(0),
    reactionsCount: integer("reactions_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_stories_user").on(table.userId, table.expiresAt),
    index("idx_stories_feed").on(table.isExpired, table.expiresAt),
    index("idx_stories_created").on(table.createdAt),
    index("idx_stories_archived").on(table.userId, table.isArchived),
    index("idx_stories_visibility").on(table.visibility),
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

// Story Highlights (permanent collections on profile)
export const storyHighlights = pgTable(
  "story_highlights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    coverImageUrl: text("cover_image_url"),
    position: integer("position").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_highlights_user").on(table.userId, table.position),
  ]
);

// Story Highlight Items (junction)
export const storyHighlightItems = pgTable(
  "story_highlight_items",
  {
    highlightId: uuid("highlight_id")
      .references(() => storyHighlights.id, { onDelete: "cascade" })
      .notNull(),
    storyId: uuid("story_id")
      .references(() => stories.id, { onDelete: "cascade" })
      .notNull(),
    position: integer("position").default(0),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.highlightId, table.storyId] }),
    index("idx_highlight_items").on(table.highlightId, table.position),
  ]
);

// Story Quiz Answers
export const storyQuizAnswers = pgTable(
  "story_quiz_answers",
  {
    storyId: uuid("story_id")
      .references(() => stories.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    answerIndex: integer("answer_index").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.storyId, table.userId] }),
    index("idx_quiz_answers_story").on(table.storyId),
  ]
);

// Story Question Box Responses
export const storyQuestionResponses = pgTable(
  "story_question_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .references(() => stories.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    response: text("response").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_question_response").on(table.storyId, table.userId),
    index("idx_question_responses_story").on(table.storyId),
  ]
);
