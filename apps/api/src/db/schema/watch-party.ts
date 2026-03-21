import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// ─── Watch Party Rooms ────────────────────────────────────────────────────────
export const watchPartyRooms = pgTable(
  "watch_party_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(), // 6-char invite code e.g. "XK9M2P"
    hostUserId: uuid("host_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    mediaTitle: text("media_title"),
    mediaSource: text("media_source"), // "netflix" | "disney" | "max" | "prime"
    mediaUrl: text("media_url"),
    maxMembers: integer("max_members").default(8).notNull(),
    status: text("status").notNull().default("waiting"), // "waiting" | "active" | "ended"
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_wp_rooms_code").on(table.code),
    index("idx_wp_rooms_host").on(table.hostUserId),
    index("idx_wp_rooms_status").on(table.status),
  ]
);

// ─── Watch Party Members ──────────────────────────────────────────────────────
export const watchPartyMembers = pgTable(
  "watch_party_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .references(() => watchPartyRooms.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (table) => [
    unique("unique_wp_member").on(table.roomId, table.userId),
    index("idx_wp_members_room").on(table.roomId),
    index("idx_wp_members_user").on(table.userId),
  ]
);

// Chat messages são efêmeros (in-memory apenas).
// Não há tabela de mensagens — o chat não é persistido.

