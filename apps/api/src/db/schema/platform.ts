import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const platformAnnouncements = pgTable(
  "platform_announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull().default("info"), // info | warning | success | promo
    imageUrl: text("image_url"),
    actionLabel: text("action_label"),
    actionUrl: text("action_url"),
    isActive: boolean("is_active").default(true),
    dismissible: boolean("dismissible").default(true),
    targetAudience: text("target_audience").notNull().default("all"), // all | premium | free
    startAt: timestamp("start_at", { withTimezone: true }).defaultNow(),
    endAt: timestamp("end_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_announcements_active").on(table.isActive),
    index("idx_announcements_created_by").on(table.createdBy),
  ],
);
