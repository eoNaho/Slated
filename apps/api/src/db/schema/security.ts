import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  inet,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Two-Factor Authentication
export const userTwoFactor = pgTable(
  "user_two_factor",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").array(),
    isEnabled: boolean("is_enabled").default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_user_two_factor_user").on(table.userId)]
);

// Audit Logs
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    metadata: text("metadata"), // JSON string
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_audit_logs_user").on(table.userId),
    index("idx_audit_logs_action").on(table.action),
    index("idx_audit_logs_created").on(table.createdAt),
  ]
);

// Notifications
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    fromUserId: uuid("from_user_id").references(() => user.id, { onDelete: "set null" }),
    type: text("type").notNull(), // 'follow', 'like', 'comment', 'achievement', 'system'
    title: text("title").notNull(),
    message: text("message"),
    data: text("data"), // JSON string
    isRead: boolean("is_read").default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_notifications_user").on(table.userId),
    index("idx_notifications_created").on(table.createdAt),
  ]
);

// Login History
export const loginHistory = pgTable(
  "login_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    deviceType: text("device_type"),
    location: text("location"),
    success: boolean("success").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_login_history_user").on(table.userId),
    index("idx_login_history_created").on(table.createdAt),
  ]
);
