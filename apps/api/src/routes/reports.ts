import { Elysia, t } from "elysia";
import {
  db,
  user,
  reviews,
  lists,
  comments,
  stories,
  reports,
  eq,
  and,
  gte,
  count,
  desc,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";
import { checkReportEscalation } from "../lib/moderation-escalation";

export const reportsRoutes = new Elysia({ prefix: "/reports", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Submit a report on any piece of content
  .post(
    "/",
    async ({ user: authUser, body, set }: any) => {
      const { targetType, targetId, reason, description } = body;

      // Per-user rate limit: max 10 reports per hour
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [{ reportCount }] = await db
        .select({ reportCount: count() })
        .from(reports)
        .where(and(eq(reports.reporterId, authUser.id), gte(reports.createdAt, hourAgo)));

      if (Number(reportCount) >= 10) {
        set.status = 429;
        return { error: "Report limit reached. Try again later." };
      }

      // Verify target exists
      let targetExists = false;
      if (targetType === "review") {
        const [row] = await db.select({ id: reviews.id }).from(reviews).where(eq(reviews.id, targetId));
        targetExists = !!row;
      } else if (targetType === "comment") {
        const [row] = await db.select({ id: comments.id }).from(comments).where(eq(comments.id, targetId));
        targetExists = !!row;
      } else if (targetType === "list") {
        const [row] = await db.select({ id: lists.id }).from(lists).where(eq(lists.id, targetId));
        targetExists = !!row;
      } else if (targetType === "user") {
        const [row] = await db.select({ id: user.id }).from(user).where(eq(user.id, targetId));
        targetExists = !!row;
      } else if (targetType === "story") {
        const [row] = await db.select({ id: stories.id }).from(stories).where(eq(stories.id, targetId));
        targetExists = !!row;
      }

      if (!targetExists) {
        set.status = 404;
        return { error: "Target not found" };
      }

      // Prevent duplicate reports within 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [existing] = await db
        .select({ id: reports.id })
        .from(reports)
        .where(and(eq(reports.reporterId, authUser.id), eq(reports.targetId, targetId), gte(reports.createdAt, since)));

      if (existing) {
        set.status = 409;
        return { error: "You already reported this recently" };
      }

      const [created] = await db
        .insert(reports)
        .values({
          reporterId: authUser.id,
          targetType,
          targetId,
          reason,
          description: description ?? null,
          status: "pending",
          priority: "medium",
        })
        .returning();

      // Auto-escalate priority based on report volume
      await checkReportEscalation(targetId);

      return { data: created };
    },
    {
      requireAuth: true,
      body: t.Object({
        targetType: t.Union([
          t.Literal("user"),
          t.Literal("review"),
          t.Literal("comment"),
          t.Literal("list"),
          t.Literal("story"),
        ]),
        targetId: t.String(),
        reason: t.Union([
          t.Literal("spam"),
          t.Literal("harassment"),
          t.Literal("inappropriate"),
          t.Literal("copyright"),
          t.Literal("hate_speech"),
          t.Literal("misinformation"),
          t.Literal("impersonation"),
          t.Literal("self_harm"),
          t.Literal("other"),
        ]),
        description: t.Optional(t.String({ maxLength: 2000 })),
      }),
    }
  )

  // Get my submitted reports
  .get(
    "/mine",
    async (ctx: any) => {
      const { user: authUser, query } = ctx;
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const rows = await db
        .select()
        .from(reports)
        .where(eq(reports.reporterId, authUser.id))
        .orderBy(desc(reports.createdAt))
        .limit(limit)
        .offset(offset);

      return { data: rows, page, limit };
    },
    {
      requireAuth: true,
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  );
