import {
  db,
  reports,
  moderationActions,
  contentFlags,
  reviews,
  comments,
  user,
  eq,
  and,
  inArray,
  count,
  gte,
} from "../db";
import { notifyModerationAction } from "./moderation-notifications";

/**
 * After a new report is created, escalate priority if many reports target the same content.
 */
export async function checkReportEscalation(targetId: string) {
  try {
    const [{ reportCount }] = await db
      .select({ reportCount: count() })
      .from(reports)
      .where(
        and(
          eq(reports.targetId, targetId),
          inArray(reports.status, ["pending", "investigating"])
        )
      );

    const n = Number(reportCount);
    if (n >= 5) {
      await db
        .update(reports)
        .set({ priority: "critical" })
        .where(
          and(
            eq(reports.targetId, targetId),
            inArray(reports.status, ["pending", "investigating"])
          )
        );
    } else if (n >= 3) {
      await db
        .update(reports)
        .set({ priority: "high" })
        .where(
          and(
            eq(reports.targetId, targetId),
            inArray(reports.status, ["pending", "investigating"])
          )
        );
    }
  } catch (e) {
    console.error("[checkReportEscalation] failed:", e);
  }
}

/**
 * After a moderation action is taken against a user, auto-escalate for repeated offenders.
 * >= 3 warn/hide/delete actions in 30 days → auto-suspend
 * >= 5 → auto-ban
 */
export async function checkRepeatedOffender(
  targetUserId: string,
  moderatorId: string
): Promise<{ escalated: boolean; action?: string }> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [{ actionCount }] = await db
      .select({ actionCount: count() })
      .from(moderationActions)
      .where(
        and(
          eq(moderationActions.targetUserId, targetUserId),
          inArray(moderationActions.action, ["warn", "hide", "delete"]),
          gte(moderationActions.createdAt, since)
        )
      );

    const n = Number(actionCount);

    if (n >= 5) {
      await db
        .update(user)
        .set({ status: "banned" } as any)
        .where(eq(user.id, targetUserId));

      await db.insert(moderationActions).values({
        moderatorId,
        targetUserId,
        targetType: "user",
        targetId: targetUserId,
        action: "ban",
        reason: `Auto-ban: ${n} moderation actions in the last 30 days`,
        automated: true,
      });

      return { escalated: true, action: "ban" };
    } else if (n >= 3) {
      await db
        .update(user)
        .set({ status: "suspended" } as any)
        .where(eq(user.id, targetUserId));

      await db.insert(moderationActions).values({
        moderatorId,
        targetUserId,
        targetType: "user",
        targetId: targetUserId,
        action: "suspend",
        reason: `Auto-suspend: ${n} moderation actions in the last 30 days`,
        automated: true,
      });

      await notifyModerationAction(targetUserId, "suspend_user");
      return { escalated: true, action: "suspend" };
    }

    return { escalated: false };
  } catch (e) {
    console.error("[checkRepeatedOffender] failed:", e);
    return { escalated: false };
  }
}

/**
 * Detect rate spam during content creation.
 * >10 comments in 5 min or >3 reviews in 10 min → create content_flag with flagType=rate_spam
 */
export async function checkContentVelocity(
  userId: string,
  contentType: "comment" | "review"
): Promise<{ flagged: boolean }> {
  try {
    if (contentType === "comment") {
      const since = new Date(Date.now() - 5 * 60 * 1000);
      const [{ n }] = await db
        .select({ n: count() })
        .from(comments)
        .where(and(eq(comments.userId, userId), gte(comments.createdAt, since)));

      if (Number(n) > 10) {
        await db.insert(contentFlags).values({
          targetType: "comment",
          targetId: userId,
          flagType: "rate_spam",
          severity: "medium",
          details: JSON.stringify({ userId, commentCount: Number(n), windowMinutes: 5 }),
          autoActioned: false,
        });
        return { flagged: true };
      }
    } else if (contentType === "review") {
      const since = new Date(Date.now() - 10 * 60 * 1000);
      const [{ n }] = await db
        .select({ n: count() })
        .from(reviews)
        .where(and(eq(reviews.userId, userId), gte(reviews.createdAt, since)));

      if (Number(n) > 3) {
        await db.insert(contentFlags).values({
          targetType: "review",
          targetId: userId,
          flagType: "rate_spam",
          severity: "medium",
          details: JSON.stringify({ userId, reviewCount: Number(n), windowMinutes: 10 }),
          autoActioned: false,
        });
        return { flagged: true };
      }
    }

    return { flagged: false };
  } catch (e) {
    console.error("[checkContentVelocity] failed:", e);
    return { flagged: false };
  }
}
