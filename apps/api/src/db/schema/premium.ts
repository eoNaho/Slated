import {
  pgTable,
  uuid,
  text,
  boolean,
  decimal,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Plans
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique().notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }),
  priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }),
  features: text("features"), // JSON string array
  limits: text("limits"), // JSON object
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Subscriptions
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    planId: uuid("plan_id").references(() => plans.id),
    status: text("status").default("active"), // 'active' | 'canceled' | 'expired' | 'past_due'
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_subscriptions_user").on(table.userId)]
);

// Payments
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").default("USD"),
    status: text("status"), // 'pending' | 'completed' | 'failed' | 'refunded'
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_payments_user").on(table.userId)]
);

// Reports
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").references(() => user.id, {
      onDelete: "set null",
    }),
    targetType: text("target_type").notNull(), // 'user' | 'review' | 'comment' | 'list'
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    description: text("description"),
    status: text("status").default("pending"), // 'pending' | 'investigating' | 'resolved' | 'dismissed'
    priority: text("priority").default("medium"), // 'low' | 'medium' | 'high' | 'critical'
    assignedTo: uuid("assigned_to").references(() => user.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_reports_status").on(table.status)]
);

// Plan Feature Flags — toggle features per plan via admin dashboard
export const planFeatureFlags = pgTable(
  "plan_feature_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    featureKey: text("feature_key").notNull(),
    plan: text("plan").notNull(), // 'free' | 'pro' | 'ultra'
    enabled: boolean("enabled").default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [unique("unique_feature_plan").on(table.featureKey, table.plan)]
);
