import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const CLUB_CATEGORIES = [
  // Genres
  "action",
  "comedy",
  "drama",
  "horror",
  "sci-fi",
  "thriller",
  "romance",
  "crime",
  "fantasy",
  "mystery",
  "animation",
  "anime",
  "documentary",
  "musical",
  // Thematic
  "by-director",
  "by-actor",
  "by-decade",
  "by-country",
  "general",
] as const;

export type ClubCategory = (typeof CLUB_CATEGORIES)[number];

export const clubRoleEnum = pgEnum("club_role", [
  "owner",
  "moderator",
  "member",
]);

export const clubInviteStatusEnum = pgEnum("club_invite_status", [
  "pending",
  "accepted",
  "declined",
  "expired",
]);

// Main clubs table
export const clubs = pgTable(
  "clubs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").unique().notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    isPublic: boolean("is_public").default(true).notNull(),
    categories: text("categories").array().default([]).notNull(),
    memberCount: integer("member_count").default(1).notNull(),
    maxMembers: integer("max_members").notNull(),
    ownerId: uuid("owner_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_clubs_owner").on(table.ownerId),
    index("idx_clubs_public").on(table.isPublic),
    index("idx_clubs_created").on(table.createdAt),
  ]
);

// Club memberships
export const clubMembers = pgTable(
  "club_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .references(() => clubs.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    role: clubRoleEnum("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_club_member").on(table.clubId, table.userId),
    index("idx_club_members_club").on(table.clubId),
    index("idx_club_members_user").on(table.userId),
  ]
);

// Club invites (for private clubs or direct invitations)
export const clubInvites = pgTable(
  "club_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .references(() => clubs.id, { onDelete: "cascade" })
      .notNull(),
    invitedBy: uuid("invited_by")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    invitedUserId: uuid("invited_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: clubInviteStatusEnum("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_pending_invite").on(table.clubId, table.invitedUserId),
    index("idx_club_invites_invited").on(table.invitedUserId),
    index("idx_club_invites_club").on(table.clubId),
  ]
);
