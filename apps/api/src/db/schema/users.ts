import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
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
