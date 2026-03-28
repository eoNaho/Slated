import { Elysia } from "elysia";
import { db, eq, desc, and, count, sql, notInArray, isNull, or, gte } from "../db";
import { notifications } from "../db/schema/security";
import { betterAuthPlugin } from "../lib/auth";
import { blockedUserIds } from "../lib/block-filter";
import { sendToUser } from "../services/ws-manager";
import { encrypt, decrypt } from "../services/crypto";
import { ListNotificationsQuery, IdParam } from "@pixelreel/validators";
import { ok } from "../utils/response";

// Notification types that carry private message content — encrypt message preview
const ENCRYPTED_TYPES = new Set(["dm", "story_reply"]);

export const notificationsRoutes = new Elysia({ prefix: "/notifications", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get user notifications
  .get(
    "/",
    async ({ query, ...ctx }) => {
      const user = (ctx as any).user;

      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;
      const unreadOnly = query.unread === "true";

      const blockedSub = blockedUserIds(user.id);
      const baseConditions = [eq(notifications.userId, user.id)];
      if (unreadOnly) baseConditions.push(eq(notifications.isRead, false));
      baseConditions.push(
        or(
          isNull(notifications.fromUserId),
          notInArray(notifications.fromUserId, blockedSub) as any,
        ) as any,
      );
      const where = and(...baseConditions);

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

      const decryptedRows = await Promise.all(
        rows.map(async (n) => {
          const parsedData = n.data ? (() => { try { return JSON.parse(n.data); } catch { return null; } })() : null;
          let message = n.message;
          if (
            ENCRYPTED_TYPES.has(n.type) &&
            message &&
            (message.startsWith("h1:") || message.startsWith("s1:")) &&
            parsedData?.conversationId
          ) {
            try {
              message = await decrypt(message, parsedData.conversationId);
            } catch {
              message = null;
            }
          }
          return { ...n, message, data: parsedData };
        }),
      );

      return {
        data: decryptedRows,
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
      query: ListNotificationsQuery,
    },
  )

  // Mark notification as read
  .patch(
    "/:id/read",
    async ({ params, set, ...ctx }) => {
      const user = (ctx as any).user;

      const [updated] = await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.id, params.id), eq(notifications.userId, user.id)))
        .returning({ id: notifications.id });

      if (!updated) {
        set.status = 404;
        return { error: "Notification not found" };
      }

      return ok({ id: updated.id, isRead: true });
    },
    {
      requireAuth: true,
      params: IdParam,
    },
  )

  // Mark all as read
  .post(
    "/read-all",
    async ({ ...ctx }) => {
      const user = (ctx as any).user;

      const result = await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)))
        .returning({ id: notifications.id });

      return ok({ updated: result.length });
    },
    { requireAuth: true },
  )

  // Get unread count
  .get(
    "/unread-count",
    async ({ ...ctx }) => {
      const user = (ctx as any).user;

      const [{ total }] = await db
        .select({ total: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));

      return ok({ count: Number(total) });
    },
    { requireAuth: true },
  );

// Notification service for creating notifications from other routes
export const createNotification = async (
  userId: string,
  type: "follow" | "like" | "comment" | "achievement" | "story_reaction" | "story_reply" | "story_mention" | "club_invite" | "dm" | "system" | "moderation_warning" | "content_hidden" | "content_restored" | "account_suspended",
  title: string,
  message: string,
  data?: Record<string, any>,
  fromUserId?: string,
) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.type, type),
      gte(notifications.createdAt, fiveMinutesAgo),
    ];
    if (fromUserId) conditions.push(eq(notifications.fromUserId, fromUserId) as any);

    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(...conditions))
      .limit(1);

    if (existing) return;

    let storedMessage = message;
    const conversationId = data?.conversationId as string | undefined;
    if (ENCRYPTED_TYPES.has(type) && conversationId && message) {
      storedMessage = await encrypt(message, conversationId);
    }

    const [inserted] = await db.insert(notifications).values({
      userId,
      fromUserId: fromUserId ?? null,
      type,
      title,
      message: storedMessage,
      data: data ? JSON.stringify(data) : null,
    }).returning();

    sendToUser(userId, {
      type: "notification",
      notification: {
        id: inserted.id,
        type: inserted.type,
        title: inserted.title,
        message: inserted.message,
        data: data ?? null,
        isRead: false,
        createdAt: inserted.createdAt,
      },
    });
  } catch (e) {
    console.error("[createNotification] failed:", e);
  }
};
