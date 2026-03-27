import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// User settings
export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  theme: text("theme").default("system"),
  language: text("language").default("en"),
  privacy: text("privacy").default(
    '{"profile": "public", "activity": "public", "watchlist": "public"}'
  ),
  notifications: text("notifications").default(
    '{"email": true, "push": true, "followers": true, "comments": true}'
  ),
  accentColor: text("accent_color"),
  profileTheme: text("profile_theme"),
  layoutConfig: text("layout_config"), // JSON string with section order
  showcasedBadges: text("showcased_badges"), // JSON string array of achievement IDs
  // Privacy settings (typed columns, supersede the legacy JSON `privacy` field)
  isPrivate: boolean("is_private").notNull().default(false),
  visibilityDiary: text("visibility_diary").notNull().default("public"),
  visibilityWatchlist: text("visibility_watchlist").notNull().default("public"),
  visibilityActivity: text("visibility_activity").notNull().default("public"),
  visibilityReviews: text("visibility_reviews").notNull().default("public"),
  visibilityLists: text("visibility_lists").notNull().default("public"),
  visibilityLikes: text("visibility_likes").notNull().default("public"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// User social links
export const userSocialLinks = pgTable("user_social_links", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  twitter: text("twitter"),
  instagram: text("instagram"),
  letterboxd: text("letterboxd"),
  imdb: text("imdb"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
