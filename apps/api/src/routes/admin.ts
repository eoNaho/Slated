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
  diary,
  stories,
  loginHistory,
  auditLogs,
  wordBlocklist,
  platformAnnouncements,
  bookmarks,
  subscriptions,
  eq,
  desc,
  asc,
  count,
  ilike,
  or,
  and,
  sql,
  gte,
  lte,
  isNotNull,
} from "../db";
import { contentFilterService } from "../services/content-filter";
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
      [{ totalBookmarks }],
      [{ pastDueSubscriptions }],
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
      db.select({ totalBookmarks: count() }).from(bookmarks),
      db.select({ pastDueSubscriptions: count() }).from(subscriptions).where(eq(subscriptions.status, "past_due")),
    ]);

    return {
      data: {
        user: totalUsers,
        media: totalMedia,
        reviews: totalReviews,
        lists: totalLists,
        reports: pendingReports,
        totalBookmarks,
        pastDueSubscriptions,
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

  // ── Stats: user growth time-series ────────────────────────────────────────
  .get(
    "/stats/user-growth",
    async ({ query }: any) => {
      const period = query.period || "30d";
      const days = period === "12m" ? 365 : period === "90d" ? 90 : 30;
      const groupBy = period === "12m" ? "week" : "day";
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          date: sql<string>`date_trunc(${sql.raw(`'${groupBy}'`)}, ${user.createdAt})::date`,
          count: count(),
        })
        .from(user)
        .where(gte(user.createdAt, since))
        .groupBy(sql`date_trunc(${sql.raw(`'${groupBy}'`)}, ${user.createdAt})`)
        .orderBy(sql`date_trunc(${sql.raw(`'${groupBy}'`)}, ${user.createdAt})`);

      return { data: rows };
    },
    {
      query: t.Object({
        period: t.Optional(t.String()),
      }),
    }
  )

  // ── Stats: content activity time-series ───────────────────────────────────
  .get(
    "/stats/content-activity",
    async ({ query }: any) => {
      const days = Number(query.days) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [reviewRows, commentRows, listRows, diaryRows] = await Promise.all([
        db
          .select({
            date: sql<string>`date_trunc('day', ${reviews.createdAt})::date`,
            count: count(),
          })
          .from(reviews)
          .where(gte(reviews.createdAt, since))
          .groupBy(sql`date_trunc('day', ${reviews.createdAt})`)
          .orderBy(sql`date_trunc('day', ${reviews.createdAt})`),
        db
          .select({
            date: sql<string>`date_trunc('day', ${comments.createdAt})::date`,
            count: count(),
          })
          .from(comments)
          .where(gte(comments.createdAt, since))
          .groupBy(sql`date_trunc('day', ${comments.createdAt})`)
          .orderBy(sql`date_trunc('day', ${comments.createdAt})`),
        db
          .select({
            date: sql<string>`date_trunc('day', ${lists.createdAt})::date`,
            count: count(),
          })
          .from(lists)
          .where(gte(lists.createdAt, since))
          .groupBy(sql`date_trunc('day', ${lists.createdAt})`)
          .orderBy(sql`date_trunc('day', ${lists.createdAt})`),
        db
          .select({
            date: sql<string>`date_trunc('day', ${diary.watchedAt})::date`,
            count: count(),
          })
          .from(diary)
          .where(gte(diary.watchedAt, since.toISOString().split("T")[0]))
          .groupBy(sql`date_trunc('day', ${diary.watchedAt})`)
          .orderBy(sql`date_trunc('day', ${diary.watchedAt})`),
      ]);

      // Merge into a map keyed by date
      const dateMap: Record<string, { reviews: number; comments: number; lists: number; diary: number }> = {};
      const addRows = (arr: { date: string; count: number }[], key: keyof typeof dateMap[string]) => {
        arr.forEach(({ date, count: c }) => {
          if (!dateMap[date]) dateMap[date] = { reviews: 0, comments: 0, lists: 0, diary: 0 };
          (dateMap[date] as Record<string, number>)[key] = Number(c);
        });
      };
      addRows(reviewRows, "reviews");
      addRows(commentRows, "comments");
      addRows(listRows, "lists");
      addRows(diaryRows, "diary");

      const merged = Object.entries(dateMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({ date, ...counts }));

      return { data: merged };
    },
    {
      query: t.Object({
        days: t.Optional(t.String()),
      }),
    }
  )

  // ── Stats: reports analytics ───────────────────────────────────────────────
  .get("/stats/reports-analytics", async () => {
    const [byReason, byStatus, avgResolution] = await Promise.all([
      db
        .select({ reason: reports.reason, count: count() })
        .from(reports)
        .groupBy(reports.reason)
        .orderBy(desc(count())),
      db
        .select({ status: reports.status, count: count() })
        .from(reports)
        .groupBy(reports.status),
      db
        .select({
          avg: sql<string>`COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (${reports.resolvedAt} - ${reports.createdAt})) / 3600)::numeric, 1), 0)`,
        })
        .from(reports)
        .where(sql`${reports.resolvedAt} IS NOT NULL`),
    ]);

    return {
      data: {
        byReason: byReason.map((r) => ({ reason: r.reason, count: Number(r.count) })),
        byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
        avgResolutionHours: Number(avgResolution[0]?.avg ?? 0),
      },
    };
  })

  // ── Subscriptions at risk (past_due) ───────────────────────────────────────
  .get("/subscriptions/at-risk", async ({ query }: any) => {
    const limit = Math.min(Number(query?.limit ?? 20), 50);
    const offset = (Math.max(Number(query?.page ?? 1), 1) - 1) * limit;

    const [atRisk, [{ total }]] = await Promise.all([
      db
        .select({
          id: subscriptions.id,
          userId: subscriptions.userId,
          status: subscriptions.status,
          stripeCustomerId: subscriptions.stripeCustomerId,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          updatedAt: subscriptions.updatedAt,
          user: {
            name: user.name,
            email: user.email,
            image: user.image,
          },
        })
        .from(subscriptions)
        .innerJoin(user, eq(subscriptions.userId, user.id))
        .where(eq(subscriptions.status, "past_due"))
        .orderBy(desc(subscriptions.updatedAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(subscriptions).where(eq(subscriptions.status, "past_due")),
    ]);

    return { data: atRisk, total, page: Math.max(Number(query?.page ?? 1), 1), limit };
  })

  // ── Health check ───────────────────────────────────────────────────────────
  .get("/health", async ({ set }: any) => {
    let dbStatus: "ok" | "error" = "error";
    let redisStatus: "ok" | "error" = "error";

    try {
      await db.execute(sql`SELECT 1`);
      dbStatus = "ok";
    } catch { /* */ }

    try {
      const { redis } = await import("../lib/redis").catch(() => ({ redis: null }));
      if (redis) {
        await (redis as any).ping();
        redisStatus = "ok";
      }
    } catch { /* */ }

    const { getStorageStats } = await import("../lib/storage");
    const storage = await getStorageStats().catch(() => ({ objectCount: 0, totalSizeBytes: 0, formattedSize: "N/A" }));

    return {
      data: {
        api: "ok" as const,
        db: dbStatus,
        redis: redisStatus,
        storage: {
          objectCount: storage.objectCount,
          totalSizeBytes: storage.totalSizeBytes,
          formattedSize: storage.formattedSize,
        },
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
  )

  // ── Blocklist ──────────────────────────────────────────────────────────────
  .get(
    "/blocklist",
    async ({ query }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 50, 200);
      const offset = (page - 1) * limit;
      const condition = query.q ? ilike(wordBlocklist.word, `%${query.q}%`) : undefined;

      const [rows, [{ total }]] = await Promise.all([
        db.select().from(wordBlocklist).where(condition).orderBy(desc(wordBlocklist.createdAt)).limit(limit).offset(offset),
        db.select({ total: count() }).from(wordBlocklist).where(condition),
      ]);

      return { data: rows, total: Number(total), page, limit };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        q: t.Optional(t.String()),
      }),
    }
  )

  .post(
    "/blocklist",
    async ({ user: authUser, body }: any) => {
      const [created] = await db
        .insert(wordBlocklist)
        .values({
          word: body.word,
          matchType: body.matchType ?? "exact",
          severity: body.severity ?? "medium",
          category: body.category ?? "profanity",
          addedBy: authUser.id,
        })
        .onConflictDoNothing()
        .returning();

      contentFilterService.invalidateCache();

      await AuditService.log({
        userId: authUser.id,
        action: "admin_blocklist_add",
        entityType: "word_blocklist",
        metadata: { word: body.word },
      });

      return { data: created };
    },
    {
      body: t.Object({
        word: t.String({ minLength: 1 }),
        matchType: t.Optional(t.Union([t.Literal("exact"), t.Literal("contains"), t.Literal("regex")])),
        severity: t.Optional(t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")])),
        category: t.Optional(t.Union([t.Literal("profanity"), t.Literal("slur"), t.Literal("spam"), t.Literal("custom")])),
      }),
    }
  )

  .patch(
    "/blocklist/:id",
    async ({ user: authUser, params, body, set }: any) => {
      const updates: Record<string, unknown> = {};
      if (body.word !== undefined) updates.word = body.word;
      if (body.matchType !== undefined) updates.matchType = body.matchType;
      if (body.severity !== undefined) updates.severity = body.severity;
      if (body.category !== undefined) updates.category = body.category;
      if (body.isActive !== undefined) updates.isActive = body.isActive;

      const [updated] = await db.update(wordBlocklist).set(updates).where(eq(wordBlocklist.id, params.id)).returning();
      if (!updated) { set.status = 404; return { error: "Entry not found" }; }

      contentFilterService.invalidateCache();

      await AuditService.log({
        userId: authUser.id,
        action: "admin_blocklist_update",
        entityType: "word_blocklist",
        entityId: params.id,
        metadata: updates,
      });

      return { data: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        word: t.Optional(t.String({ minLength: 1 })),
        matchType: t.Optional(t.Union([t.Literal("exact"), t.Literal("contains"), t.Literal("regex")])),
        severity: t.Optional(t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")])),
        category: t.Optional(t.Union([t.Literal("profanity"), t.Literal("slur"), t.Literal("spam"), t.Literal("custom")])),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  .delete(
    "/blocklist/:id",
    async ({ user: authUser, params, set }: any) => {
      const [deleted] = await db.delete(wordBlocklist).where(eq(wordBlocklist.id, params.id)).returning();
      if (!deleted) { set.status = 404; return { error: "Entry not found" }; }

      contentFilterService.invalidateCache();

      await AuditService.log({
        userId: authUser.id,
        action: "admin_blocklist_delete",
        entityType: "word_blocklist",
        entityId: params.id,
        metadata: { word: deleted.word },
      });

      return { data: { deleted: true } };
    },
    { params: t.Object({ id: t.String() }) }
  )

  .post(
    "/blocklist/import",
    async ({ user: authUser, body }: any) => {
      const rows = (body.words as { word: string; matchType?: string; severity?: string; category?: string }[]).map((w) => ({
        word: w.word,
        matchType: w.matchType ?? "exact",
        severity: w.severity ?? "medium",
        category: w.category ?? "profanity",
        addedBy: authUser.id,
      }));

      const inserted = await db.insert(wordBlocklist).values(rows).onConflictDoNothing().returning();
      contentFilterService.invalidateCache();

      await AuditService.log({
        userId: authUser.id,
        action: "admin_blocklist_import",
        entityType: "word_blocklist",
        metadata: { count: inserted.length },
      });

      return { data: { inserted: inserted.length } };
    },
    {
      body: t.Object({
        words: t.Array(t.Object({
          word: t.String(),
          matchType: t.Optional(t.String()),
          severity: t.Optional(t.String()),
          category: t.Optional(t.String()),
        }), { minItems: 1 }),
      }),
    }
  );

// ── Announcements CRUD ──────────────────────────────────────────────────────────

adminOnlyRoutes
  .get("/announcements", async ({ query }: any) => {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(platformAnnouncements).orderBy(desc(platformAnnouncements.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(platformAnnouncements),
    ]);

    return { data: rows, total: Number(total), page, limit };
  })

  .post("/announcements", async ({ body, set }: any) => {
    const [row] = await db.insert(platformAnnouncements).values({
      title: body.title,
      message: body.message,
      type: body.type ?? "info",
      imageUrl: body.imageUrl ?? null,
      actionLabel: body.actionLabel ?? null,
      actionUrl: body.actionUrl ?? null,
      isActive: body.isActive ?? true,
      dismissible: body.dismissible ?? true,
      targetAudience: body.targetAudience ?? "all",
      startAt: body.startAt ? new Date(body.startAt) : new Date(),
      endAt: body.endAt ? new Date(body.endAt) : null,
    }).returning();
    set.status = 201;
    return { data: row };
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      message: t.String({ minLength: 1 }),
      type: t.Optional(t.String()),
      imageUrl: t.Optional(t.Nullable(t.String())),
      actionLabel: t.Optional(t.Nullable(t.String())),
      actionUrl: t.Optional(t.Nullable(t.String())),
      isActive: t.Optional(t.Boolean()),
      dismissible: t.Optional(t.Boolean()),
      targetAudience: t.Optional(t.String()),
      startAt: t.Optional(t.Nullable(t.String())),
      endAt: t.Optional(t.Nullable(t.String())),
    }),
  })

  .patch("/announcements/:id", async ({ params, body, set }: any) => {
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.message !== undefined) updates.message = body.message;
    if (body.type !== undefined) updates.type = body.type;
    if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl;
    if (body.actionLabel !== undefined) updates.actionLabel = body.actionLabel;
    if (body.actionUrl !== undefined) updates.actionUrl = body.actionUrl;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.dismissible !== undefined) updates.dismissible = body.dismissible;
    if (body.targetAudience !== undefined) updates.targetAudience = body.targetAudience;
    if (body.startAt !== undefined) updates.startAt = body.startAt ? new Date(body.startAt) : null;
    if (body.endAt !== undefined) updates.endAt = body.endAt ? new Date(body.endAt) : null;
    updates.updatedAt = new Date();

    const [row] = await db.update(platformAnnouncements).set(updates).where(eq(platformAnnouncements.id, params.id)).returning();
    if (!row) { set.status = 404; return { error: "Not found" }; }
    return { data: row };
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      message: t.Optional(t.String()),
      type: t.Optional(t.String()),
      imageUrl: t.Optional(t.Nullable(t.String())),
      actionLabel: t.Optional(t.Nullable(t.String())),
      actionUrl: t.Optional(t.Nullable(t.String())),
      isActive: t.Optional(t.Boolean()),
      dismissible: t.Optional(t.Boolean()),
      targetAudience: t.Optional(t.String()),
      startAt: t.Optional(t.Nullable(t.String())),
      endAt: t.Optional(t.Nullable(t.String())),
    }),
  })

  .delete("/announcements/:id", async ({ params, set }: any) => {
    const [row] = await db.delete(platformAnnouncements).where(eq(platformAnnouncements.id, params.id)).returning({ id: platformAnnouncements.id });
    if (!row) { set.status = 404; return { error: "Not found" }; }
    return { success: true };
  })

  .post("/announcements/:id/push", async ({ params, set }: any) => {
    const [row] = await db.select().from(platformAnnouncements).where(eq(platformAnnouncements.id, params.id)).limit(1);
    if (!row) { set.status = 404; return { error: "Not found" }; }
    const { broadcastToAll } = await import("../services/ws-manager");
    broadcastToAll({ type: "announcement", data: row });
    return { success: true };
  });

// ── Compose ────────────────────────────────────────────────────────────────────

export const adminRoutes = new Elysia()
  .use(staffRoutes)
  .use(adminOnlyRoutes);
