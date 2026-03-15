import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  real,
  timestamp,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Achievements
export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon"),
  category: text("category"), // 'watching' | 'social' | 'critic' | 'explorer' | 'collector' | 'special'
  type: text("type"), // 'milestone' | 'streak' | 'challenge' | 'rare'
  rarity: text("rarity"), // 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  xpReward: integer("xp_reward").default(0),
  requirements: text("requirements"), // JSON string
  isSecret: boolean("is_secret").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// User Achievements
export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    achievementId: uuid("achievement_id")
      .references(() => achievements.id, { onDelete: "cascade" })
      .notNull(),
    progress: integer("progress").default(0),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.achievementId] })]
);

// User Stats
export const userStats = pgTable("user_stats", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  xp: integer("xp").default(0),
  level: integer("level").default(1),
  moviesWatched: integer("movies_watched").default(0),
  seriesWatched: integer("series_watched").default(0),
  episodesWatched: integer("episodes_watched").default(0),
  watchTimeMins: integer("watch_time_mins").default(0),
  reviewsCount: integer("reviews_count").default(0),
  listsCount: integer("lists_count").default(0),
  likesReceived: integer("likes_received").default(0),
  followersCount: integer("followers_count").default(0),
  followingCount: integer("following_count").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  averageRating: real("average_rating"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// XP Activities Log
export const xpActivities = pgTable(
  "xp_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type").notNull(),
    xpGained: integer("xp_gained").notNull(),
    description: text("description"),
    metadata: text("metadata"), // JSON string
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_xp_activities_user").on(table.userId)]
);
