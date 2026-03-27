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
import { media } from "./media";

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

export const clubJoinRequestStatusEnum = pgEnum("club_join_request_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const clubEventTypeEnum = pgEnum("club_event_type", [
  "watch",
  "discussion",
]);

export const clubEventRsvpStatusEnum = pgEnum("club_event_rsvp_status", [
  "going",
  "interested",
  "not_going",
]);

// ─── Main clubs table ────────────────────────────────────────────────────────

export const clubs = pgTable(
  "clubs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").unique().notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    isPublic: boolean("is_public").default(true).notNull(),
    allowJoinRequests: boolean("allow_join_requests").default(false).notNull(),
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
  ],
);

// ─── Club memberships ────────────────────────────────────────────────────────

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
  ],
);

// ─── Club invites (for private clubs or direct invitations) ──────────────────

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
  ],
);

// ─── Club join requests (for private clubs with allowJoinRequests=true) ───────

export const clubJoinRequests = pgTable(
  "club_join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .references(() => clubs.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    message: text("message"),
    status: clubJoinRequestStatusEnum("status").default("pending").notNull(),
    respondedBy: uuid("responded_by").references(() => user.id),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_join_request").on(table.clubId, table.userId),
    index("idx_join_requests_club").on(table.clubId),
    index("idx_join_requests_user").on(table.userId),
  ],
);

// ─── Club shared watchlist ────────────────────────────────────────────────────

export const clubWatchlistItems = pgTable(
  "club_watchlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .references(() => clubs.id, { onDelete: "cascade" })
      .notNull(),
    mediaId: uuid("media_id").references(() => media.id, {
      onDelete: "cascade",
    }),
    // Denormalized for display without extra joins
    mediaTitle: text("media_title").notNull(),
    mediaPosterPath: text("media_poster_path"),
    mediaType: text("media_type").notNull(), // "movie" | "series"
    suggestedBy: uuid("suggested_by").references(() => user.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    isWatched: boolean("is_watched").default(false).notNull(),
    watchedAt: timestamp("watched_at", { withTimezone: true }),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_club_watchlist_club").on(table.clubId),
    index("idx_club_watchlist_media").on(table.mediaId),
  ],
);

// ─── Club screening events ────────────────────────────────────────────────────

export const clubScreeningEvents = pgTable(
  "club_screening_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .references(() => clubs.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    eventType: clubEventTypeEnum("event_type").default("watch").notNull(),
    // Optional linked film (usually for "watch" type)
    mediaId: uuid("media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    mediaTitle: text("media_title"),
    mediaPosterPath: text("media_poster_path"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    meetLink: text("meet_link"),
    goingCount: integer("going_count").default(0).notNull(),
    interestedCount: integer("interested_count").default(0).notNull(),
    createdBy: uuid("created_by")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_club_events_club").on(table.clubId),
    index("idx_club_events_scheduled").on(table.scheduledAt),
  ],
);

export const clubEventRsvps = pgTable(
  "club_event_rsvps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .references(() => clubScreeningEvents.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: clubEventRsvpStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_event_rsvp").on(table.eventId, table.userId),
    index("idx_event_rsvps_event").on(table.eventId),
    index("idx_event_rsvps_user").on(table.userId),
  ],
);

// ─── Club posts (discussions + pinned announcements) ─────────────────────────

export const clubPosts = pgTable(
  "club_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .references(() => clubs.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    // Optional: discussion about a specific film
    mediaId: uuid("media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    mediaTitle: text("media_title"),
    title: text("title").notNull(),
    content: text("content").notNull(),
    isPinned: boolean("is_pinned").default(false).notNull(),
    commentsCount: integer("comments_count").default(0).notNull(),
    score: integer("score").default(0).notNull(),
    upvoteCount: integer("upvote_count").default(0).notNull(),
    downvoteCount: integer("downvote_count").default(0).notNull(),
    flair: text("flair"),
    flairColor: text("flair_color"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_club_posts_club").on(table.clubId),
    index("idx_club_posts_user").on(table.userId),
    index("idx_club_posts_pinned").on(table.clubId, table.isPinned),
  ],
);

export const clubPostComments = pgTable(
  "club_post_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .references(() => clubPosts.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    parentId: uuid("parent_id"),
    content: text("content").notNull(),
    score: integer("score").default(0).notNull(),
    upvoteCount: integer("upvote_count").default(0).notNull(),
    downvoteCount: integer("downvote_count").default(0).notNull(),
    depth: integer("depth").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_post_comments_post").on(table.postId),
    index("idx_post_comments_parent").on(table.parentId),
  ],
);

// ─── Club polls ───────────────────────────────────────────────────────────────

export const clubPolls = pgTable(
  "club_polls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .references(() => clubs.id, { onDelete: "cascade" })
      .notNull(),
    createdBy: uuid("created_by")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    question: text("question").notNull(),
    totalVotes: integer("total_votes").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_club_polls_club").on(table.clubId)],
);

export const clubPollOptions = pgTable(
  "club_poll_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .references(() => clubPolls.id, { onDelete: "cascade" })
      .notNull(),
    text: text("text").notNull(),
    // Optional linked film for "which movie to watch" polls
    mediaId: uuid("media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    mediaPosterPath: text("media_poster_path"),
    votesCount: integer("votes_count").default(0).notNull(),
  },
  (table) => [index("idx_poll_options_poll").on(table.pollId)],
);

export const clubPollVotes = pgTable(
  "club_poll_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .references(() => clubPolls.id, { onDelete: "cascade" })
      .notNull(),
    optionId: uuid("option_id")
      .references(() => clubPollOptions.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_poll_vote").on(table.pollId, table.userId),
    index("idx_poll_votes_poll").on(table.pollId),
  ],
);

// ─── Club post votes (upvote/downvote on posts) ───────────────────────────────

export const clubPostVotes = pgTable(
  "club_post_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .references(() => clubPosts.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    value: integer("value").notNull(), // 1 = upvote, -1 = downvote
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_post_vote").on(table.postId, table.userId),
    index("idx_post_votes_post").on(table.postId),
  ],
);

// ─── Club comment votes (upvote/downvote on comments) ────────────────────────

export const clubCommentVotes = pgTable(
  "club_comment_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .references(() => clubPostComments.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    value: integer("value").notNull(), // 1 = upvote, -1 = downvote
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_comment_vote").on(table.commentId, table.userId),
    index("idx_comment_votes_comment").on(table.commentId),
  ],
);

// ─── Club flairs ──────────────────────────────────────────────────────────────

export const clubFlairs = pgTable(
  "club_flairs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .references(() => clubs.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    color: text("color").notNull(), // hex color, e.g. "#ef4444"
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_club_flair").on(table.clubId, table.name),
    index("idx_club_flairs_club").on(table.clubId),
  ],
);
