/**
 * Audit Log Service
 * Tracks important actions for security and compliance
 */

import { db, eq, desc } from "../db";
import { loggers } from "../utils/logger";

const log = loggers.auth;

// Audit log types
type AuditAction =
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
  | "admin_action";

interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

// In-memory store (would be replaced with audit_logs table)
const auditLogs: (AuditLogEntry & { id: string; createdAt: Date })[] = [];

export class AuditService {
  /**
   * Log an audit event
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    const logEntry = {
      id: crypto.randomUUID(),
      ...entry,
      createdAt: new Date(),
    };

    auditLogs.push(logEntry);

    // Also log to pino for immediate visibility
    log.info(
      {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entityType
          ? `${entry.entityType}:${entry.entityId}`
          : undefined,
        ip: entry.ipAddress,
      },
      `Audit: ${entry.action}`
    );

    // In production, insert to audit_logs table:
    // await db.insert(auditLogs).values(logEntry)
  }

  /**
   * Get audit logs for a user
   */
  static async getByUser(
    userId: string,
    limit: number = 50
  ): Promise<typeof auditLogs> {
    return auditLogs
      .filter((l) => l.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get recent audit logs (admin)
   */
  static async getRecent(limit: number = 100): Promise<typeof auditLogs> {
    return auditLogs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Helper: Log login
   */
  static async logLogin(
    userId: string,
    success: boolean,
    ip?: string,
    ua?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: success ? "login" : "login_failed",
      ipAddress: ip,
      userAgent: ua,
    });
  }

  /**
   * Helper: Log registration
   */
  static async logRegister(
    userId: string,
    ip?: string,
    ua?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: "register",
      entityType: "user",
      entityId: userId,
      ipAddress: ip,
      userAgent: ua,
    });
  }

  /**
   * Helper: Log password change
   */
  static async logPasswordChange(userId: string, ip?: string): Promise<void> {
    await this.log({
      userId,
      action: "password_change",
      ipAddress: ip,
    });
  }

  /**
   * Helper: Log 2FA status change
   */
  static async log2FAChange(userId: string, enabled: boolean): Promise<void> {
    await this.log({
      userId,
      action: enabled ? "2fa_enabled" : "2fa_disabled",
    });
  }
}
