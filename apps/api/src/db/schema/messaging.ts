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
  jsonb,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Conversations
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(), // 'dm' | 'group'
    name: text("name"), // null for 1:1, user-set for groups
    avatarUrl: text("avatar_url"),
    createdBy: uuid("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessagePreview: text("last_message_preview"), // encrypted snippet
    messageCount: integer("message_count").default(0),
    isEncrypted: boolean("is_encrypted").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_conversations_last_message").on(table.lastMessageAt),
    index("idx_conversations_created_by").on(table.createdBy),
  ]
);

// Conversation Participants
export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role").default("member"), // 'admin' | 'member'
    nickname: text("nickname"),
    isMuted: boolean("is_muted").default(false),
    mutedUntil: timestamp("muted_until", { withTimezone: true }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
    index("idx_conv_participants_user").on(table.userId, table.leftAt),
    index("idx_conv_participants_conv").on(table.conversationId),
  ]
);

// Messages
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    senderId: uuid("sender_id")
      .references(() => user.id, { onDelete: "set null" })
      .notNull(),
    type: text("type").notNull().default("text"), // 'text' | 'story_reply' | 'image' | 'system'
    content: text("content").notNull(), // encrypted
    metadata: jsonb("metadata"), // { storyId, storyType, storyContent, storyImageUrl, mediaUrl }
    replyToId: uuid("reply_to_id"), // self-reference added via FK in migration
    isEdited: boolean("is_edited").default(false),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    isDeleted: boolean("is_deleted").default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_messages_conversation").on(
      table.conversationId,
      table.createdAt
    ),
    index("idx_messages_sender").on(table.senderId),
  ]
);

// Message Read Receipts (for granular group read status)
export const messageReadReceipts = pgTable(
  "message_read_receipts",
  {
    messageId: uuid("message_id")
      .references(() => messages.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    readAt: timestamp("read_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.userId] }),
    index("idx_read_receipts_message").on(table.messageId),
  ]
);

// Conversation Invites (for group invites)
export const conversationInvites = pgTable(
  "conversation_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    inviterId: uuid("inviter_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    inviteeId: uuid("invitee_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status").default("pending"), // 'pending' | 'accepted' | 'declined'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (table) => [
    unique("unique_conv_invite").on(table.conversationId, table.inviteeId),
    index("idx_conv_invites_invitee").on(table.inviteeId, table.status),
  ]
);

// DM Privacy Settings (per user)
export const dmSettings = pgTable("dm_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  allowDmsFrom: text("allow_dms_from").default("followers"), // 'everyone' | 'followers' | 'following' | 'mutual' | 'nobody'
  showReadReceipts: boolean("show_read_receipts").default(true),
  showTypingIndicator: boolean("show_typing_indicator").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
