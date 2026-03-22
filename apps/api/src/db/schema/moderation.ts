import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth-schema";
import { reports } from "./premium";

// User Blocks
export const userBlocks = pgTable(
  "user_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockerId: uuid("blocker_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    blockedId: uuid("blocked_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_block").on(table.blockerId, table.blockedId),
    index("idx_blocks_blocker").on(table.blockerId),
    index("idx_blocks_blocked").on(table.blockedId),
    check("no_self_block", sql`${table.blockerId} != ${table.blockedId}`),
  ]
);

// Moderation Actions — audit trail for all moderator actions
export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moderatorId: uuid("moderator_id").references(() => user.id, {
      onDelete: "set null",
    }),
    targetUserId: uuid("target_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    targetType: text("target_type").notNull(), // 'user' | 'review' | 'comment' | 'list' | 'story'
    targetId: uuid("target_id").notNull(),
    action: text("action").notNull(), // 'warn' | 'hide' | 'restore' | 'delete' | 'suspend' | 'ban' | 'unban'
    reason: text("reason"),
    reportId: uuid("report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    metadata: text("metadata"), // JSON string
    automated: boolean("automated").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_mod_actions_target_user").on(table.targetUserId),
    index("idx_mod_actions_moderator").on(table.moderatorId),
    index("idx_mod_actions_created").on(table.createdAt),
    index("idx_mod_actions_target").on(table.targetType, table.targetId),
  ]
);

// Content Flags — automated detection results
export const contentFlags = pgTable(
  "content_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type").notNull(), // 'review' | 'comment' | 'story' | 'image'
    targetId: uuid("target_id").notNull(),
    flagType: text("flag_type").notNull(), // 'profanity' | 'spam' | 'nsfw' | 'rate_spam'
    severity: text("severity").notNull().default("low"), // 'low' | 'medium' | 'high'
    details: text("details"), // JSON string — matched words, confidence scores, etc.
    autoActioned: boolean("auto_actioned").default(false),
    reviewedBy: uuid("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'dismissed'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_content_flags_target").on(table.targetType, table.targetId),
    index("idx_content_flags_status").on(table.status),
    index("idx_content_flags_created").on(table.createdAt),
  ]
);

// Word Blocklist — admin-managed profanity/spam word list
export const wordBlocklist = pgTable(
  "word_blocklist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    word: text("word").notNull(),
    matchType: text("match_type").notNull().default("exact"), // 'exact' | 'contains' | 'regex'
    severity: text("severity").notNull().default("medium"), // 'low' | 'medium' | 'high'
    category: text("category").notNull().default("profanity"), // 'profanity' | 'slur' | 'spam' | 'custom'
    isActive: boolean("is_active").notNull().default(true),
    addedBy: uuid("added_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_blocklist_word").on(table.word, table.matchType),
    index("idx_blocklist_active").on(table.isActive),
  ]
);
