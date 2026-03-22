import { Elysia, t } from "elysia";
import { db, eq, desc, and, count, sql } from "../db";
import { notifications } from "../db/schema/security";
import { betterAuthPlugin } from "../lib/auth";

export const notificationsRoutes = new Elysia({ prefix: "/notifications", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get user notifications
  .get(
    "/",
    async (ctx: any) => {
      const { user, query } = ctx;

      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;
      const unreadOnly = query.unread === "true";

      const where = unreadOnly
        ? and(eq(notifications.userId, user.id), eq(notifications.isRead, false))
        : eq(notifications.userId, user.id);

      const [rows, [{ total }], [{ unreadCount }]] = await Promise.all([
        db
          .select()
          .from(notifications)
          .where(where)
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(notifications).where(eq(notifications.userId, user.id)),
        db
          .select({ unreadCount: count() })
          .from(notifications)
          .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false))),
      ]);

      const totalNum = Number(total);
      return {
        data: rows.map((n) => ({
          ...n,
          data: n.data ? (() => { try { return JSON.parse(n.data); } catch { return null; } })() : null,
        })),
        total: totalNum,
        unreadCount: Number(unreadCount),
        page,
        limit,
        hasNext: offset + rows.length < totalNum,
        hasPrev: page > 1,
      };
    },
    {
      requireAuth: true,
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        unread: t.Optional(t.String()),
      }),
    },
  )

  // Mark notification as read
  .patch(
    "/:id/read",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [updated] = await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.id, params.id), eq(notifications.userId, user.id)))
        .returning({ id: notifications.id });

      if (!updated) {
        set.status = 404;
        return { error: "Notification not found" };
      }

      return { data: { id: updated.id, isRead: true } };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    },
  )

  // Mark all as read
  .post(
    "/read-all",
    async (ctx: any) => {
      const { user } = ctx;

      const result = await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)))
        .returning({ id: notifications.id });

      return { data: { updated: result.length } };
    },
    { requireAuth: true },
  )

  // Get unread count
  .get(
    "/unread-count",
    async (ctx: any) => {
      const { user } = ctx;

      const [{ total }] = await db
        .select({ total: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));

      return { data: { count: Number(total) } };
    },
    { requireAuth: true },
  );

// Notification service for creating notifications from other routes
export const createNotification = async (
  userId: string,
  type: "follow" | "like" | "comment" | "achievement" | "story_reaction" | "system",
  title: string,
  message: string,
  data?: Record<string, any>,
) => {
  try {
    await db.insert(notifications).values({
      userId,
      type,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
    });
  } catch (e) {
    console.error("[createNotification] failed:", e);
  }
};
