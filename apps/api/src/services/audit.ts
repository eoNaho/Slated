/**
 * Audit Log Service
 * Tracks important actions for security and compliance.
 * Persists to the audit_logs table in the database.
 */

import { db } from "../db";
import { auditLogs } from "../db/schema/security";
import { eq, desc } from "drizzle-orm";
import { loggers } from "../utils/logger";

const log = loggers.auth;

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "register"
  | "password_change"
  | "password_reset"
  | "2fa_enabled"
  | "2fa_disabled"
  | "account_deleted"
  | "profile_updated"
  | "admin_action"
  | "admin_user_status_change"
  | "admin_user_role_change"
  | "admin_user_edit"
  | "admin_user_delete"
  | "admin_content_delete"
  | "admin_content_edit"
  | "admin_content_hide"
  | "admin_report_resolve"
  | "admin_feature_flag_update"
  | "admin_blocklist_add"
  | "admin_blocklist_update"
  | "admin_blocklist_delete"
  | "admin_blocklist_import"
  | "admin_media_create"
  | "admin_media_edit"
  | "admin_media_delete"
  | "admin_club_edit"
  | "admin_club_delete"
  | "admin_club_transfer_ownership"
  | "admin_subscription_grant"
  | "admin_subscription_revoke";

interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  /**
   * Log an audit event to the database.
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      });
    } catch (err) {
      // Never let audit logging crash the main request
      log.warn({ err, action: entry.action }, "Audit log write failed");
    }

    log.info(
      {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entityType ? `${entry.entityType}:${entry.entityId}` : undefined,
        ip: entry.ipAddress,
      },
      `Audit: ${entry.action}`
    );
  }

  /**
   * Get recent audit logs (admin view).
   */
  static async getRecent(limit = 100) {
    return db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  /**
   * Get audit logs for a specific user.
   */
  static async getByUser(userId: string, limit = 50) {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  static async logLogin(userId: string, success: boolean, ip?: string, ua?: string) {
    await this.log({ userId, action: success ? "login" : "login_failed", ipAddress: ip, userAgent: ua });
  }

  static async logRegister(userId: string, ip?: string, ua?: string) {
    await this.log({ userId, action: "register", entityType: "user", entityId: userId, ipAddress: ip, userAgent: ua });
  }

  static async logPasswordChange(userId: string, ip?: string) {
    await this.log({ userId, action: "password_change", ipAddress: ip });
  }

  static async log2FAChange(userId: string, enabled: boolean) {
    await this.log({ userId, action: enabled ? "2fa_enabled" : "2fa_disabled" });
  }
}
