import { Elysia, t } from "elysia";
import {
  db,
  user,
  reports,
  media,
  reviews,
  lists,
  planFeatureFlags,
  clubs,
  comments,
  stories,
  loginHistory,
  auditLogs,
  eq,
  desc,
  asc,
  count,
  ilike,
  or,
  and,
  sql,
  gte,
  isNotNull,
} from "../db";
import { invalidateFlagsCache } from "../lib/feature-gate";
import { adminGuard, staffGuard } from "../middleware/role-guard";
import { AuditService } from "../services/audit";

// ── Staff routes (admin + moderator) ──────────────────────────────────────────

const staffRoutes = new Elysia({ prefix: "/admin" })
  .use(staffGuard())

  // ── Stats ──────────────────────────────────────────────────────────────────
  .get("/stats", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const month = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const day24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const day7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      [{ totalUsers }],
      [{ totalMedia }],
      [{ totalReviews }],
      [{ totalLists }],
      [{ pendingReports }],
      [{ investigatingReports }],
      [{ resolvedReports }],
      [{ dismissedReports }],
      [{ newToday }],
      [{ newThisWeek }],
      [{ newThisMonth }],
      [{ active24h }],
      [{ active7d }],
    ] = await Promise.all([
      db.select({ totalUsers: count() }).from(user),
      db.select({ totalMedia: count() }).from(media),
      db.select({ totalReviews: count() }).from(reviews),
      db.select({ totalLists: count() }).from(lists),
      db.select({ pendingReports: count() }).from(reports).where(eq(reports.status, "pending")),
      db.select({ investigatingReports: count() }).from(reports).where(eq(reports.status, "investigating")),
      db.select({ resolvedReports: count() }).from(reports).where(eq(reports.status, "resolved")),
      db.select({ dismissedReports: count() }).from(reports).where(eq(reports.status, "dismissed")),
      db.select({ newToday: count() }).from(user).where(gte(user.createdAt, today)),
      db.select({ newThisWeek: count() }).from(user).where(gte(user.createdAt, week)),
      db.select({ newThisMonth: count() }).from(user).where(gte(user.createdAt, month)),
      db.select({ active24h: count() }).from(user).where(and(isNotNull(user.lastActiveAt), gte(user.lastActiveAt, day24h))),
      db.select({ active7d: count() }).from(user).where(and(isNotNull(user.lastActiveAt), gte(user.lastActiveAt, day7d))),
    ]);

    return {
      data: {
        user: totalUsers,
        media: totalMedia,
        reviews: totalReviews,
        lists: totalLists,
        reports: pendingReports,
        reportsByStatus: {
          pending: pendingReports,
          investigating: investigatingReports,
          resolved: resolvedReports,
          dismissed: dismissedReports,
        },
        newUsers: { today: newToday, week: newThisWeek, month: newThisMonth },
        activeUsers: { last24h: active24h, last7d: active7d },
      },
    };
  })

  // ── Users — list (with search) ─────────────────────────────────────────────
  .get(
    "/user",
    async ({ query }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;
      const q = query.q?.trim() || "";

      const condition = q
        ? or(
            ilike(user.displayName, `%${q}%`),
            ilike(user.username, `%${q}%`),
            ilike(user.email, `%${q}%`)
          )
        : undefined;

      const [results, [{ total }]] = await Promise.all([
        db.select().from(user).where(condition).orderBy(desc(user.createdAt)).limit(limit).offset(offset),
        db.select({ total: count() }).from(user).where(condition),
      ]);

      return { data: results, total, page, limit };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        q: t.Optional(t.String()),
      }),
    }
  )

  // ── User detail ────────────────────────────────────────────────────────────
  .get(
    "/users/:id",
    async ({ params, set }: any) => {
      const [target] = await db.select().from(user).where(eq(user.id, params.id));
      if (!target) { set.status = 404; return { error: "User not found" }; }

      const [[{ reviewCount }], [{ listCount }], [{ reportCount }]] = await Promise.all([
        db.select({ reviewCount: count() }).from(reviews).where(eq(reviews.userId, params.id)),
        db.select({ listCount: count() }).from(lists).where(eq(lists.userId, params.id)),
        db.select({ reportCount: count() }).from(reports).where(eq(reports.reporterId, params.id)),
      ]);

      return { data: { ...target, stats: { reviews: reviewCount, lists: listCount, reportsFiled: reportCount } } };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ── Reports — list ────────────────────────────────────────────────────────
  .get(
    "/reports",
    async ({ query }: any) => {
      const status = query.status || "pending";
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const conditions = [eq(reports.status, status)];
      if (query.targetType) conditions.push(eq(reports.targetType, query.targetType));
      if (query.priority) conditions.push(eq(reports.priority, query.priority));

      const [results, [{ total }]] = await Promise.all([
        db
          .select({
            report: reports,
            reporter: {
              id: user.id,
              displayName: user.displayName,
              username: user.username,
              avatarUrl: user.avatarUrl,
            },
          })
          .from(reports)
          .leftJoin(user, eq(reports.reporterId, user.id))
          .where(and(...conditions))
          .orderBy(desc(reports.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(reports).where(and(...conditions)),
      ]);

      return { data: results, total, page, limit };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        targetType: t.Optional(t.String()),
        priority: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // ── Report detail ──────────────────────────────────────────────────────────
  .get(
    "/reports/:id",
    async ({ params, set }: any) => {
      const [row] = await db
        .select({
          report: reports,
          reporter: {
            id: user.id,
            displayName: user.displayName,
            username: user.username,
            avatarUrl: user.avatarUrl,
            email: user.email,
          },
        })
        .from(reports)
        .leftJoin(user, eq(reports.reporterId, user.id))
        .where(eq(reports.id, params.id));

      if (!row) { set.status = 404; return { error: "Report not found" }; }

      // Load content preview based on targetType
      let content: unknown = null;
      const { targetType, targetId } = row.report;
      if (targetType === "review" && targetId) {
        [content] = await db.select().from(reviews).where(eq(reviews.id, targetId));
      } else if (targetType === "comment" && targetId) {
        [content] = await db.select().from(comments).where(eq(comments.id, targetId));
      } else if (targetType === "list" && targetId) {
        [content] = await db.select().from(lists).where(eq(lists.id, targetId));
      } else if (targetType === "user" && targetId) {
        [content] = await db.select().from(user).where(eq(user.id, targetId));
      }

      return { data: { ...row, content } };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ── Report update (status / priority / assignedTo) ─────────────────────────
  .patch(
    "/reports/:id",
    async ({ user: authUser, params, body, set }: any) => {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.status !== undefined) updates.status = body.status;
      if (body.priority !== undefined) updates.priority = body.priority;
      if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo;
      if (body.status === "resolved" || body.status === "dismissed") {
        updates.resolvedBy = authUser.id;
        updates.resolvedAt = new Date();
      }

      const [updated] = await db.update(reports).set(updates).where(eq(reports.id, params.id)).returning();
      if (!updated) { set.status = 404; return { error: "Report not found" }; }

      if (body.status === "resolved" || body.status === "dismissed") {
        await AuditService.log({
          userId: authUser.id,
          action: "admin_report_resolve",
          entityType: "report",
          entityId: params.id,
          metadata: { status: body.status, targetType: updated.targetType },
        });
      }

      return { data: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Optional(t.Union([
          t.Literal("pending"), t.Literal("investigating"),
          t.Literal("resolved"), t.Literal("dismissed"),
        ])),
        priority: t.Optional(t.Union([
          t.Literal("low"), t.Literal("medium"), t.Literal("high"), t.Literal("critical"),
        ])),
        assignedTo: t.Optional(t.Nullable(t.String())),
      }),
    }
  )

  // ── Report resolve (legacy endpoint — kept for dashboard compat) ───────────
  .patch(
    "/reports/:id/resolve",
    async ({ user: authUser, params, body, set }: any) => {
      const [updated] = await db
        .update(reports)
        .set({ status: body.status, resolvedBy: authUser.id, resolvedAt: new Date(), updatedAt: new Date() })
        .where(eq(reports.id, params.id))
        .returning();

      if (!updated) { set.status = 404; return { error: "Report not found" }; }

      await AuditService.log({
        userId: authUser.id,
        action: "admin_report_resolve",
        entityType: "report",
        entityId: params.id,
        metadata: { status: body.status },
      });

      return { data: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([t.Literal("resolved"), t.Literal("dismissed")]),
      }),
    }
  )

  // ── Report action (ban user, delete content) ───────────────────────────────
  .post(
    "/reports/:id/action",
    async ({ user: authUser, params, body, set }: any) => {
      const [report] = await db.select().from(reports).where(eq(reports.id, params.id));
      if (!report) { set.status = 404; return { error: "Report not found" }; }

      if (body.action === "ban_user" && report.targetType === "user" && report.targetId) {
        await db.update(user).set({ status: "banned" }).where(eq(user.id, report.targetId));
        await AuditService.log({
          userId: authUser.id,
          action: "admin_user_status_change",
          entityType: "user",
          entityId: report.targetId,
          metadata: { status: "banned", fromReport: params.id },
        });
      } else if (body.action === "delete_content") {
        if (report.targetType === "review" && report.targetId) {
          await db.delete(reviews).where(eq(reviews.id, report.targetId));
        } else if (report.targetType === "comment" && report.targetId) {
          await db.delete(comments).where(eq(comments.id, report.targetId));
        } else if (report.targetType === "list" && report.targetId) {
          await db.delete(lists).where(eq(lists.id, report.targetId));
        }
        await AuditService.log({
          userId: authUser.id,
          action: "admin_content_delete",
          entityType: report.targetType,
          entityId: report.targetId ?? undefined,
          metadata: { fromReport: params.id },
        });
      }

      // Resolve the report
      const [updated] = await db
        .update(reports)
        .set({ status: "resolved", resolvedBy: authUser.id, resolvedAt: new Date(), updatedAt: new Date() })
        .where(eq(reports.id, params.id))
        .returning();

      return { data: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        action: t.Union([t.Literal("ban_user"), t.Literal("delete_content"), t.Literal("warn_user")]),
      }),
    }
  )

  // ── Reviews moderation ────────────────────────────────────────────────────
  .get(
    "/reviews",
    async ({ query }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;
      const condition = query.userId ? eq(reviews.userId, query.userId) : undefined;

      const [results, [{ total }]] = await Promise.all([
        db.select().from(reviews).where(condition).orderBy(desc(reviews.createdAt)).limit(limit).offset(offset),
        db.select({ total: count() }).from(reviews).where(condition),
      ]);

      return { data: results, total, page, limit };
    },
    { query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()), userId: t.Optional(t.String()) }) }
  )

  .delete(
    "/reviews/:id",
    async ({ user: authUser, params, set }: any) => {
      const [target] = await db.select().from(reviews).where(eq(reviews.id, params.id));
      if (!target) { set.status = 404; return { error: "Review not found" }; }

      await db.delete(reviews).where(eq(reviews.id, params.id));

      await AuditService.log({
        userId: authUser.id,
        action: "admin_content_delete",
        entityType: "review",
        entityId: params.id,
        metadata: { ownerId: target.userId, mediaId: target.mediaId },
      });

      return { data: { deleted: true } };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ── Comments moderation ────────────────────────────────────────────────────
  .get(
    "/comments",
    async ({ query }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;
      const condition = query.userId ? eq(comments.userId, query.userId) : undefined;

      const [results, [{ total }]] = await Promise.all([
        db.select().from(comments).where(condition).orderBy(desc(comments.createdAt)).limit(limit).offset(offset),
        db.select({ total: count() }).from(comments).where(condition),
      ]);

      return { data: results, total, page, limit };
    },
    { query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()), userId: t.Optional(t.String()) }) }
  )

  .delete(
    "/comments/:id",
    async ({ user: authUser, params, set }: any) => {
      const [target] = await db.select().from(comments).where(eq(comments.id, params.id));
      if (!target) { set.status = 404; return { error: "Comment not found" }; }

      await db.delete(comments).where(eq(comments.id, params.id));

      await AuditService.log({
        userId: authUser.id,
        action: "admin_content_delete",
        entityType: "comment",
        entityId: params.id,
        metadata: { ownerId: target.userId },
      });

      return { data: { deleted: true } };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ── Stories moderation ─────────────────────────────────────────────────────
  .delete(
    "/stories/:id",
    async ({ user: authUser, params, set }: any) => {
      const [target] = await db.select().from(stories).where(eq(stories.id, params.id));
      if (!target) { set.status = 404; return { error: "Story not found" }; }

      await db.delete(stories).where(eq(stories.id, params.id));

      await AuditService.log({
        userId: authUser.id,
        action: "admin_content_delete",
        entityType: "story",
        entityId: params.id,
        metadata: { ownerId: target.userId },
      });

      return { data: { deleted: true } };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ── Clubs ──────────────────────────────────────────────────────────────────
  .get(
    "/clubs",
    async ({ query }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 30, 100);
      const offset = (page - 1) * limit;

      const condition = query.search
        ? or(ilike(clubs.name, `%${query.search}%`), ilike(clubs.description, `%${query.search}%`))
        : undefined;

      const [rows, [{ total }]] = await Promise.all([
        db.select().from(clubs).where(condition).orderBy(desc(clubs.memberCount)).limit(limit).offset(offset),
        db.select({ total: count() }).from(clubs),
      ]);

      return { data: rows, total, page, limit };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
    }
  );

// ── Admin-only routes ──────────────────────────────────────────────────────────

const adminOnlyRoutes = new Elysia({ prefix: "/admin" })
  .use(adminGuard())

  // ── User status ────────────────────────────────────────────────────────────
  .patch(
    "/user/:id/status",
    async ({ user: authUser, params, body, set }: any) => {
      const [updated] = await db
        .update(user)
        .set({ status: body.status })
        .where(eq(user.id, params.id))
        .returning();

      if (!updated) { set.status = 404; return { error: "User not found" }; }

      await AuditService.log({
        userId: authUser.id,
        action: "admin_user_status_change",
        entityType: "user",
        entityId: params.id,
        metadata: { status: body.status },
      });

      return { data: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([t.Literal("active"), t.Literal("suspended"), t.Literal("banned")]),
      }),
    }
  )

  // ── User role change ───────────────────────────────────────────────────────
  .patch(
    "/users/:id/role",
    async ({ user: authUser, params, body, set }: any) => {
      if (params.id === authUser.id) {
        set.status = 400;
        return { error: "Cannot change your own role" };
      }

      // Safety: ensure at least one other admin remains before demoting
      if (body.role !== "admin") {
        const [{ adminCount }] = await db
          .select({ adminCount: count() })
          .from(user)
          .where(eq(user.role, "admin"));
        const [target] = await db.select({ role: user.role }).from(user).where(eq(user.id, params.id));
        if (target?.role === "admin" && adminCount <= 1) {
          set.status = 400;
          return { error: "Cannot demote the last admin" };
        }
      }

      const [updated] = await db
        .update(user)
        .set({ role: body.role })
        .where(eq(user.id, params.id))
        .returning();

      if (!updated) { set.status = 404; return { error: "User not found" }; }

      await AuditService.log({
        userId: authUser.id,
        action: "admin_user_role_change",
        entityType: "user",
        entityId: params.id,
        metadata: { role: body.role },
      });

      return { data: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        role: t.Union([t.Literal("user"), t.Literal("moderator"), t.Literal("admin")]),
      }),
    }
  )

  // ── User login history ─────────────────────────────────────────────────────
  .get(
    "/users/:id/login-history",
    async ({ params }: any) => {
      const rows = await db
        .select()
        .from(loginHistory)
        .where(eq(loginHistory.userId, params.id))
        .orderBy(desc(loginHistory.createdAt))
        .limit(50);

      return { data: rows };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ── Lists moderation (admin-only) ──────────────────────────────────────────
  .delete(
    "/lists/:id",
    async ({ user: authUser, params, set }: any) => {
      const [target] = await db.select().from(lists).where(eq(lists.id, params.id));
      if (!target) { set.status = 404; return { error: "List not found" }; }

      await db.delete(lists).where(eq(lists.id, params.id));

      await AuditService.log({
        userId: authUser.id,
        action: "admin_content_delete",
        entityType: "list",
        entityId: params.id,
        metadata: { ownerId: target.userId, name: target.name },
      });

      return { data: { deleted: true } };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ── Feature Flags ──────────────────────────────────────────────────────────
  .get("/feature-flags", async () => {
    const flags = await db.select().from(planFeatureFlags);
    return { data: flags };
  })

  .patch(
    "/feature-flags",
    async ({ user: authUser, body }: any) => {
      const { featureKey, plan, enabled } = body;

      const [updated] = await db
        .insert(planFeatureFlags)
        .values({ featureKey, plan, enabled })
        .onConflictDoUpdate({
          target: [planFeatureFlags.featureKey, planFeatureFlags.plan],
          set: { enabled, updatedAt: new Date() },
        })
        .returning();

      await invalidateFlagsCache();

      await AuditService.log({
        userId: authUser.id,
        action: "admin_feature_flag_update",
        entityType: "feature_flag",
        metadata: { featureKey, plan, enabled },
      });

      return { data: updated };
    },
    {
      body: t.Object({
        featureKey: t.String(),
        plan: t.Union([t.Literal("free"), t.Literal("pro"), t.Literal("ultra")]),
        enabled: t.Boolean(),
      }),
    }
  )

  // ── Audit Logs ────────────────────────────────────────────────────────────
  .get(
    "/audit-logs",
    async ({ query }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 30, 100);
      const offset = (page - 1) * limit;

      const conditions: ReturnType<typeof eq>[] = [];
      if (query.action) conditions.push(eq(auditLogs.action, query.action));
      if (query.userId) conditions.push(eq(auditLogs.userId, query.userId));
      if (query.from) conditions.push(gte(auditLogs.createdAt, new Date(query.from)));

      const condition = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [{ total }]] = await Promise.all([
        db
          .select({
            log: auditLogs,
            actor: { id: user.id, displayName: user.displayName, username: user.username, avatarUrl: user.avatarUrl },
          })
          .from(auditLogs)
          .leftJoin(user, eq(auditLogs.userId, user.id))
          .where(condition)
          .orderBy(desc(auditLogs.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(auditLogs).where(condition),
      ]);

      return { data: rows, total, page, limit };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        action: t.Optional(t.String()),
        userId: t.Optional(t.String()),
        from: t.Optional(t.String()),
      }),
    }
  );

// ── Compose ────────────────────────────────────────────────────────────────────

export const adminRoutes = new Elysia()
  .use(staffRoutes)
  .use(adminOnlyRoutes);
