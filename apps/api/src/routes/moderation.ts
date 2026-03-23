import { Elysia, t } from "elysia";
import {
  db,
  reports,
  reviews,
  comments,
  user,
  moderationActions,
  contentFlags,
  eq,
  and,
  or,
  desc,
  count,
  inArray,
  isNull,
} from "../db";
import { staffGuard } from "../middleware/role-guard";
import { notifyModerationAction } from "../lib/moderation-notifications";
import { checkRepeatedOffender } from "../lib/moderation-escalation";

const moderationRoutes = new Elysia({ prefix: "/moderation", tags: ["Moderation"] })
  .use(staffGuard())

  // ── Queue ──────────────────────────────────────────────────────────────────

  .get(
    "/queue",
    async ({ query }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 30, 100);
      const offset = (page - 1) * limit;

      // Build conditions — respect the status filter sent by the frontend
      const statusCondition = query.status
        ? eq(reports.status, query.status)
        : inArray(reports.status, ["pending", "investigating"]);

      const conditions: any[] = [statusCondition];
      if (query.targetType) conditions.push(eq(reports.targetType, query.targetType));
      if (query.priority) conditions.push(eq(reports.priority, query.priority));
      if (query.assignedTo) conditions.push(eq(reports.assignedTo, query.assignedTo));

      const rows = await db
        .select()
        .from(reports)
        .where(and(...conditions))
        .orderBy(desc(reports.priority), reports.createdAt)
        .limit(limit)
        .offset(offset);

      // Fetch reporters in batch
      const reporterIds = [...new Set(rows.map((r) => r.reporterId).filter(Boolean))] as string[];
      const reporterMap = new Map<string, any>();
      if (reporterIds.length > 0) {
        const reporters = await db
          .select({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          })
          .from(user)
          .where(inArray(user.id, reporterIds));
        for (const r of reporters) reporterMap.set(r.id, r);
      }

      // Calculate reportCount per (targetType, targetId) — how many reports exist for the same target
      const reportCountMap = new Map<string, number>();
      if (rows.length > 0) {
        const targets = [...new Set(rows.map((r) => `${r.targetType}:${r.targetId}`))];
        for (const target of targets) {
          const [tt, tid] = target.split(":") as [string, string];
          const [{ c }] = await db
            .select({ c: count() })
            .from(reports)
            .where(and(eq(reports.targetType, tt), eq(reports.targetId, tid)));
          reportCountMap.set(target, Number(c));
        }
      }

      // Always fetch pending & investigating counts for the tab badges
      const [[{ pending }], [{ investigating }]] = await Promise.all([
        db.select({ pending: count() }).from(reports).where(eq(reports.status, "pending")),
        db.select({ investigating: count() }).from(reports).where(eq(reports.status, "investigating")),
      ]);

      return {
        data: {
          pending: Number(pending),
          investigating: Number(investigating),
          reports: rows.map((r) => ({
            report: r,
            reporter: r.reporterId ? reporterMap.get(r.reporterId) ?? null : null,
            reportCount: reportCountMap.get(`${r.targetType}:${r.targetId}`) ?? 1,
          })),
        },
        total: rows.length,
        page,
        limit,
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        status: t.Optional(t.String()),
        targetType: t.Optional(t.String()),
        priority: t.Optional(t.String()),
        assignedTo: t.Optional(t.String()),
      }),
    }
  )

  // ── Assign report ──────────────────────────────────────────────────────────

  .post(
    "/reports/:id/assign",
    async ({ params, body, user: moderator, set }: any) => {
      const [report] = await db.select().from(reports).where(eq(reports.id, params.id));
      if (!report) {
        set.status = 404;
        return { error: "Report not found" };
      }

      const assignTo = body.moderatorId ?? moderator.id;

      const [updated] = await db
        .update(reports)
        .set({ assignedTo: assignTo, status: "investigating", updatedAt: new Date() })
        .where(eq(reports.id, params.id))
        .returning();

      await db.insert(moderationActions).values({
        moderatorId: moderator.id,
        targetType: report.targetType,
        targetId: report.targetId,
        action: "assign",
        reason: `Report assigned to ${assignTo}`,
        reportId: params.id,
      });

      return { data: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ moderatorId: t.Optional(t.String()) }),
    }
  )

  // ── Resolve report with action ─────────────────────────────────────────────

  .post(
    "/reports/:id/resolve",
    async ({ params, body, user: moderator, set }: any) => {
      const [report] = await db.select().from(reports).where(eq(reports.id, params.id));
      if (!report) {
        set.status = 404;
        return { error: "Report not found" };
      }

      const { action, reason, resolutionNote } = body;
      const now = new Date();

      // Determine target owner for notifications
      let targetUserId: string | null = null;

      if (action === "warn") {
        // Resolve target owner to notify
        targetUserId = await resolveTargetOwner(report.targetType, report.targetId);
        if (targetUserId) {
          await db.insert(moderationActions).values({
            moderatorId: moderator.id,
            targetUserId,
            targetType: report.targetType,
            targetId: report.targetId,
            action: "warn",
            reason,
            reportId: params.id,
          });
          await notifyModerationAction(targetUserId, "warn");
        }
      } else if (action === "hide_content") {
        if (report.targetType === "review") {
          const [r] = await db.select({ userId: reviews.userId }).from(reviews).where(eq(reviews.id, report.targetId));
          targetUserId = r?.userId ?? null;
          await db.update(reviews).set({
            isHidden: true,
            hiddenReason: reason ?? "Violação das diretrizes da comunidade",
            hiddenAt: now,
            hiddenBy: moderator.id,
          }).where(eq(reviews.id, report.targetId));
        } else if (report.targetType === "comment") {
          const [c] = await db.select({ userId: comments.userId }).from(comments).where(eq(comments.id, report.targetId));
          targetUserId = c?.userId ?? null;
          await db.update(comments).set({
            isHidden: true,
            hiddenReason: reason ?? "Violação das diretrizes da comunidade",
            hiddenAt: now,
            hiddenBy: moderator.id,
          }).where(eq(comments.id, report.targetId));
        }
        if (targetUserId) {
          await db.insert(moderationActions).values({
            moderatorId: moderator.id,
            targetUserId,
            targetType: report.targetType,
            targetId: report.targetId,
            action: "hide",
            reason,
            reportId: params.id,
          });
          await notifyModerationAction(targetUserId, "hide_content");
        }
      } else if (action === "delete_content") {
        targetUserId = await resolveTargetOwner(report.targetType, report.targetId);
        if (report.targetType === "review") {
          await db.delete(reviews).where(eq(reviews.id, report.targetId));
        } else if (report.targetType === "comment") {
          await db.delete(comments).where(eq(comments.id, report.targetId));
        }
        if (targetUserId) {
          await db.insert(moderationActions).values({
            moderatorId: moderator.id,
            targetUserId,
            targetType: report.targetType,
            targetId: report.targetId,
            action: "delete",
            reason,
            reportId: params.id,
          });
          await notifyModerationAction(targetUserId, "hide_content");
        }
      } else if (action === "suspend_user") {
        targetUserId = report.targetType === "user"
          ? report.targetId
          : await resolveTargetOwner(report.targetType, report.targetId);
        if (targetUserId) {
          await db.update(user).set({ status: "suspended" } as any).where(eq(user.id, targetUserId));
          await db.insert(moderationActions).values({
            moderatorId: moderator.id,
            targetUserId,
            targetType: "user",
            targetId: targetUserId,
            action: "suspend",
            reason,
            reportId: params.id,
          });
          await notifyModerationAction(targetUserId, "suspend_user");
        }
      } else if (action === "ban_user") {
        targetUserId = report.targetType === "user"
          ? report.targetId
          : await resolveTargetOwner(report.targetType, report.targetId);
        if (targetUserId) {
          await db.update(user).set({ status: "banned" } as any).where(eq(user.id, targetUserId));
          await db.insert(moderationActions).values({
            moderatorId: moderator.id,
            targetUserId,
            targetType: "user",
            targetId: targetUserId,
            action: "ban",
            reason,
            reportId: params.id,
          });
        }
      }

      // Mark report as resolved/dismissed
      const finalStatus = action === "dismiss" ? "dismissed" : "resolved";
      const [updated] = await db
        .update(reports)
        .set({
          status: finalStatus,
          resolvedBy: moderator.id,
          resolvedAt: now,
          resolutionNote: resolutionNote ?? reason ?? null,
          updatedAt: now,
        })
        .where(eq(reports.id, params.id))
        .returning();

      // Check repeated offender (only for punitive actions against a user)
      if (targetUserId && ["warn", "hide_content", "delete_content", "suspend_user", "ban_user"].includes(action)) {
        await checkRepeatedOffender(targetUserId, moderator.id);
      }

      return { data: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        action: t.Union([
          t.Literal("warn"),
          t.Literal("hide_content"),
          t.Literal("delete_content"),
          t.Literal("suspend_user"),
          t.Literal("ban_user"),
          t.Literal("dismiss"),
        ]),
        reason: t.Optional(t.String()),
        resolutionNote: t.Optional(t.String()),
      }),
    }
  )

  // ── Proactive content hide ─────────────────────────────────────────────────

  .post(
    "/content/:type/:id/hide",
    async ({ params, body, user: moderator, set }: any) => {
      const { type, id } = params;
      const reason = body.reason ?? "Violação das diretrizes";
      const now = new Date();

      let targetUserId: string | null = null;

      if (type === "review") {
        const [r] = await db.select({ userId: reviews.userId }).from(reviews).where(eq(reviews.id, id));
        if (!r) { set.status = 404; return { error: "Review not found" }; }
        targetUserId = r.userId;
        await db.update(reviews).set({ isHidden: true, hiddenReason: reason, hiddenAt: now, hiddenBy: moderator.id }).where(eq(reviews.id, id));
      } else if (type === "comment") {
        const [c] = await db.select({ userId: comments.userId }).from(comments).where(eq(comments.id, id));
        if (!c) { set.status = 404; return { error: "Comment not found" }; }
        targetUserId = c.userId;
        await db.update(comments).set({ isHidden: true, hiddenReason: reason, hiddenAt: now, hiddenBy: moderator.id }).where(eq(comments.id, id));
      } else {
        set.status = 400;
        return { error: "Unsupported content type" };
      }

      if (targetUserId) {
        await db.insert(moderationActions).values({
          moderatorId: moderator.id,
          targetUserId,
          targetType: type,
          targetId: id,
          action: "hide",
          reason,
        });
        await notifyModerationAction(targetUserId, "hide_content");
      }

      return { success: true };
    },
    {
      params: t.Object({ type: t.String(), id: t.String() }),
      body: t.Object({ reason: t.Optional(t.String()) }),
    }
  )

  // ── Restore hidden content ─────────────────────────────────────────────────

  .post(
    "/content/:type/:id/restore",
    async ({ params, user: moderator, set }: any) => {
      const { type, id } = params;
      let targetUserId: string | null = null;

      if (type === "review") {
        const [r] = await db.select({ userId: reviews.userId }).from(reviews).where(eq(reviews.id, id));
        if (!r) { set.status = 404; return { error: "Review not found" }; }
        targetUserId = r.userId;
        await db.update(reviews).set({ isHidden: false, hiddenReason: null, hiddenAt: null, hiddenBy: null }).where(eq(reviews.id, id));
      } else if (type === "comment") {
        const [c] = await db.select({ userId: comments.userId }).from(comments).where(eq(comments.id, id));
        if (!c) { set.status = 404; return { error: "Comment not found" }; }
        targetUserId = c.userId;
        await db.update(comments).set({ isHidden: false, hiddenReason: null, hiddenAt: null, hiddenBy: null }).where(eq(comments.id, id));
      } else {
        set.status = 400;
        return { error: "Unsupported content type" };
      }

      if (targetUserId) {
        await db.insert(moderationActions).values({
          moderatorId: moderator.id,
          targetUserId,
          targetType: type,
          targetId: id,
          action: "restore",
        });
        await notifyModerationAction(targetUserId, "restore");
      }

      return { success: true };
    },
    {
      params: t.Object({ type: t.String(), id: t.String() }),
    }
  )

  // ── Warn user ──────────────────────────────────────────────────────────────

  .post(
    "/users/:id/warn",
    async ({ params, body, user: moderator, set }: any) => {
      const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, params.id));
      if (!target) { set.status = 404; return { error: "User not found" }; }

      await db.insert(moderationActions).values({
        moderatorId: moderator.id,
        targetUserId: params.id,
        targetType: "user",
        targetId: params.id,
        action: "warn",
        reason: body.reason,
      });

      await notifyModerationAction(params.id, "warn");
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ reason: t.String() }),
    }
  )

  // ── User moderation history ────────────────────────────────────────────────

  .get(
    "/users/:id/history",
    async ({ params, query }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const [actions, [{ actionTotal }], [{ reportCount }]] = await Promise.all([
        db
          .select()
          .from(moderationActions)
          .where(eq(moderationActions.targetUserId, params.id))
          .orderBy(desc(moderationActions.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ actionTotal: count() }).from(moderationActions).where(eq(moderationActions.targetUserId, params.id)),
        db.select({ reportCount: count() }).from(reports).where(eq(reports.targetId, params.id)),
      ]);

      return {
        data: actions,
        total: Number(actionTotal),
        reportCount: Number(reportCount),
        page,
        limit,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // ── Content flags ──────────────────────────────────────────────────────────

  .get(
    "/flags",
    async ({ query }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 30, 100);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];
      if (query.status) conditions.push(eq(contentFlags.status, query.status));
      else conditions.push(eq(contentFlags.status, "pending"));
      if (query.flagType) conditions.push(eq(contentFlags.flagType, query.flagType));
      if (query.severity) conditions.push(eq(contentFlags.severity, query.severity));

      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(contentFlags)
          .where(and(...conditions))
          .orderBy(desc(contentFlags.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(contentFlags).where(and(...conditions)),
      ]);

      return { data: rows, total: Number(total), page, limit };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        status: t.Optional(t.String()),
        flagType: t.Optional(t.String()),
        severity: t.Optional(t.String()),
      }),
    }
  )

  .patch(
    "/flags/:id",
    async ({ params, body, user: moderator, set }: any) => {
      const [flag] = await db.select().from(contentFlags).where(eq(contentFlags.id, params.id));
      if (!flag) { set.status = 404; return { error: "Flag not found" }; }

      const [updated] = await db
        .update(contentFlags)
        .set({
          status: body.status,
          reviewedBy: moderator.id,
          reviewedAt: new Date(),
        })
        .where(eq(contentFlags.id, params.id))
        .returning();

      return { data: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([t.Literal("confirmed"), t.Literal("dismissed")]),
      }),
    }
  );

// ── Helper ─────────────────────────────────────────────────────────────────

async function resolveTargetOwner(targetType: string, targetId: string): Promise<string | null> {
  if (targetType === "review") {
    const [r] = await db.select({ userId: reviews.userId }).from(reviews).where(eq(reviews.id, targetId));
    return r?.userId ?? null;
  }
  if (targetType === "comment") {
    const [c] = await db.select({ userId: comments.userId }).from(comments).where(eq(comments.id, targetId));
    return c?.userId ?? null;
  }
  if (targetType === "user") return targetId;
  return null;
}

export { moderationRoutes };
