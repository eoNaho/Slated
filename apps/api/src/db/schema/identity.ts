import { relations } from "drizzle-orm";
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
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { achievements } from "./gamification";
import { media } from "./media";

// Profile Frames — catalog of available frames (animated or static ring around avatar)
export const profileFrames = pgTable("profile_frames", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  color: text("color").notNull(),
  isAnimated: boolean("is_animated").default(false),
  minPlan: text("min_plan").notNull().default("pro"), // 'free' | 'pro' | 'ultra'
  previewUrl: text("preview_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Profile Titles — catalog of title badges shown under username
export const profileTitles = pgTable("profile_titles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  bgColor: text("bg_color").notNull(),
  textColor: text("text_color").notNull(),
  source: text("source").notNull(), // 'plan' | 'xp' | 'achievement'
  minPlan: text("min_plan"), // nullable — only for source='plan'
  xpRequired: integer("xp_required"), // nullable — only for source='xp'
  achievementId: uuid("achievement_id").references(() => achievements.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// User Titles — which titles a user has unlocked
export const userTitles = pgTable(
  "user_titles",
  {
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    titleId: uuid("title_id")
      .references(() => profileTitles.id, { onDelete: "cascade" })
      .notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.titleId] })]
);

// User Identity Perks — per-user active identity configuration
export const userIdentityPerks = pgTable("user_identity_perks", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  frameId: uuid("frame_id").references(() => profileFrames.id, {
    onDelete: "set null",
  }),
  activeTitleId: uuid("active_title_id").references(() => profileTitles.id, {
    onDelete: "set null",
  }),
  badgeEnabled: boolean("badge_enabled").default(false),
  verified: boolean("verified").default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Media Custom Covers — user-uploaded custom poster for a specific media item
export const mediaCustomCovers = pgTable(
  "media_custom_covers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    imagePath: text("image_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unique_user_media_cover").on(table.userId, table.mediaId),
    index("idx_custom_covers_user").on(table.userId),
    index("idx_custom_covers_media").on(table.mediaId),
  ]
);

// Relations
export const profileFramesRelations = relations(
  profileFrames,
  ({ many }) => ({
    userIdentityPerks: many(userIdentityPerks),
  })
);

export const profileTitlesRelations = relations(
  profileTitles,
  ({ one, many }) => ({
    achievement: one(achievements, {
      fields: [profileTitles.achievementId],
      references: [achievements.id],
    }),
    userIdentityPerks: many(userIdentityPerks),
    userTitles: many(userTitles),
  })
);

export const userTitlesRelations = relations(userTitles, ({ one }) => ({
  user: one(user, {
    fields: [userTitles.userId],
    references: [user.id],
  }),
  title: one(profileTitles, {
    fields: [userTitles.titleId],
    references: [profileTitles.id],
  }),
}));

export const userIdentityPerksRelations = relations(
  userIdentityPerks,
  ({ one }) => ({
    user: one(user, {
      fields: [userIdentityPerks.userId],
      references: [user.id],
    }),
    frame: one(profileFrames, {
      fields: [userIdentityPerks.frameId],
      references: [profileFrames.id],
    }),
    activeTitle: one(profileTitles, {
      fields: [userIdentityPerks.activeTitleId],
      references: [profileTitles.id],
    }),
  })
);

export const mediaCustomCoversRelations = relations(
  mediaCustomCovers,
  ({ one }) => ({
    user: one(user, {
      fields: [mediaCustomCovers.userId],
      references: [user.id],
    }),
    media: one(media, {
      fields: [mediaCustomCovers.mediaId],
      references: [media.id],
    }),
  })
);
