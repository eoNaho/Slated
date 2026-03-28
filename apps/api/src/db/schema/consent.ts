import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// ============================================================
// Consent / Terms Acceptance -- LGPD Art. 7/8 compliance
// ============================================================

export const termsVersions = pgTable("terms_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentType: text("document_type").notNull(), // "terms" | "privacy"
  version: text("version").notNull(),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    termsVersionId: uuid("terms_version_id")
      .notNull()
      .references(() => termsVersions.id),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    method: text("method").notNull().default("signup"), // "signup" | "reaccept" | "oauth_signup"
  },
  (table) => [
    index("idx_consent_user_id").on(table.userId),
    index("idx_consent_terms_version").on(table.termsVersionId),
  ],
);

export const termsVersionsRelations = relations(termsVersions, ({ many }) => ({
  consentRecords: many(consentRecords),
}));

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  user: one(user, { fields: [consentRecords.userId], references: [user.id] }),
  termsVersion: one(termsVersions, {
    fields: [consentRecords.termsVersionId],
    references: [termsVersions.id],
  }),
}));
