import { Elysia, t } from "elysia";
import { db } from "../db";
import { watchPartyRooms, watchPartyMembers, user } from "../db/schema";
import { betterAuthPlugin } from "../lib/auth";
import { auth } from "../auth";
import { resolveRawToken, resolveExtensionToken } from "../lib/extension-auth";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  endRoom,
  handleMessage,
  getRoom,
  generateUniqueCode,
  serializeRoomPublic,
} from "../services/watch-party";
import { generateWsToken } from "../lib/ws-tokens";
import { eq, desc, and, isNull } from "drizzle-orm";
import { logger } from "../utils/logger";

// ─── Allowed streaming sources ────────────────────────────────────────────────
// Watch Party is restricted to known, legitimate streaming platforms.
// Prevents misuse (illegal streams, inappropriate content, etc.).
export const ALLOWED_SOURCES = ["netflix", "disney", "max", "prime"] as const;
export type AllowedSource = (typeof ALLOWED_SOURCES)[number];

function isAllowedSource(value: unknown): value is AllowedSource {
  return ALLOWED_SOURCES.includes(value as AllowedSource);
}

// ─── Helper: resolve user from session or bearer token ────────────────────────

async function resolveUser(
  headers: Headers
): Promise<{ id: string; username: string; avatarUrl: string | null } | null> {
  // Try session first
  const session = await auth.api.getSession({ headers });
  if (session?.user) {
    return {
      id: session.user.id,
      username: (session.user as any).username ?? session.user.email,
      avatarUrl: (session.user as any).avatarUrl ?? null,
    };
  }

  // Fall back to extension bearer token
  const userId = await resolveExtensionToken(headers);
  if (!userId) return null;

  const [u] = await db
    .select({ id: user.id, username: user.username, avatarUrl: user.avatarUrl })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!u) return null;
  return { id: u.id, username: u.username ?? userId, avatarUrl: u.avatarUrl };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export const watchPartyRoutes = new Elysia({
  prefix: "/watch-party",
  tags: ["Watch Party"],
})
  .use(betterAuthPlugin)

  /**
   * POST /api/v1/watch-party/rooms
   * Creates a DB record and returns the 6-char code.
   * The WS connection (which registers the in-memory room) is made separately.
   */
  .post(
    "/rooms",
    async (ctx: any) => {
      const authUser = await resolveUser(ctx.request.headers);
      if (!authUser) {
        ctx.set.status = 401;
        return { error: "Autenticação necessária." };
      }

      const { title, mediaTitle, mediaSource, mediaUrl } = ctx.body;

      if (!isAllowedSource(mediaSource)) {
        ctx.set.status = 422;
        return {
          error: `Plataforma não suportada. Use: ${ALLOWED_SOURCES.join(", ")}.`,
        };
      }

      const code = await generateUniqueCode();

      const [row] = await db
        .insert(watchPartyRooms)
        .values({
          code,
          hostUserId: authUser.id,
          title,
          mediaTitle: mediaTitle ?? null,
          mediaSource,
          mediaUrl: mediaUrl ?? null,
          status: "waiting",
        })
        .returning();

      await db
        .insert(watchPartyMembers)
        .values({ roomId: row.id, userId: authUser.id });

      logger.info({ code, userId: authUser.id }, "Watch party room created");
      return {
        code: row.code,
        id: row.id,
        title: row.title,
        status: row.status,
        createdAt: row.createdAt,
      };
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 100 }),
        mediaSource: t.Union(
          ALLOWED_SOURCES.map((s) => t.Literal(s)) as any,
          { error: `mediaSource deve ser um de: ${ALLOWED_SOURCES.join(", ")}` }
        ),
        mediaTitle: t.Optional(t.String({ maxLength: 200 })),
        mediaUrl: t.Optional(t.String()),
      }),
    }
  )

  /**
   * GET /api/v1/watch-party/rooms/:code
   * Public — returns room info for the join preview screen.
   */
  .get("/rooms/:code", async (ctx: any) => {
    const { code } = ctx.params;

    const liveRoom = getRoom(code);
    if (liveRoom) return serializeRoomPublic(liveRoom);

    const [row] = await db
      .select()
      .from(watchPartyRooms)
      .where(eq(watchPartyRooms.code, code))
      .limit(1);

    if (!row) {
      ctx.set.status = 404;
      return { error: "Sala não encontrada." };
    }

    const members = await db
      .select({ id: watchPartyMembers.id })
      .from(watchPartyMembers)
      .where(
        and(
          eq(watchPartyMembers.roomId, row.id),
          isNull(watchPartyMembers.leftAt)
        )
      );

    return {
      id: row.id,
      code: row.code,
      hostUserId: row.hostUserId,
      title: row.title,
      mediaTitle: row.mediaTitle,
      mediaSource: row.mediaSource,
      status: row.status,
      memberCount: members.length,
      maxMembers: row.maxMembers,
      createdAt: row.createdAt,
    };
  })

  /**
   * POST /api/v1/watch-party/rooms/:code/end
   * Host-only. Broadcasts room_ended and closes all WS connections.
   */
  .post("/rooms/:code/end", async (ctx: any) => {
    const authUser = await resolveUser(ctx.request.headers);
    if (!authUser) {
      ctx.set.status = 401;
      return { error: "Autenticação necessária." };
    }

    const result = await endRoom(ctx.params.code, authUser.id);
    if (result.error) {
      ctx.set.status = 403;
      return { error: result.error };
    }

    return { ok: true };
  })

  /**
   * GET /api/v1/watch-party/ws-token
   * Returns a short-lived token (2 min TTL) for the website to authenticate
   * WebSocket connections. Requires a valid session or bearer token.
   */
  .get("/ws-token", async (ctx: any) => {
    const authUser = await resolveUser(ctx.request.headers);
    if (!authUser) {
      ctx.set.status = 401;
      return { error: "Autenticação necessária." };
    }
    const token = generateWsToken(authUser.id);
    return { token };
  })

  /**
   * GET /api/v1/watch-party/my-rooms
   * Returns the last 20 rooms the authenticated user participated in.
   */
  .get("/my-rooms", async (ctx: any) => {
    const authUser = await resolveUser(ctx.request.headers);
    if (!authUser) {
      ctx.set.status = 401;
      return { error: "Autenticação necessária." };
    }

    const myRooms = await db
      .select({
        id: watchPartyRooms.id,
        code: watchPartyRooms.code,
        title: watchPartyRooms.title,
        mediaTitle: watchPartyRooms.mediaTitle,
        mediaSource: watchPartyRooms.mediaSource,
        status: watchPartyRooms.status,
        hostUserId: watchPartyRooms.hostUserId,
        createdAt: watchPartyRooms.createdAt,
        endedAt: watchPartyRooms.endedAt,
      })
      .from(watchPartyRooms)
      .innerJoin(
        watchPartyMembers,
        eq(watchPartyMembers.roomId, watchPartyRooms.id)
      )
      .where(eq(watchPartyMembers.userId, authUser.id))
      .orderBy(desc(watchPartyRooms.createdAt))
      .limit(20);

    return { rooms: myRooms };
  });

// ─── WebSocket Handler ────────────────────────────────────────────────────────
// Elysia's app.ws() must be called on the root app — cannot live inside a group.
// Called from apps/api/src/index.ts via mountWatchPartyWS(app).

export function mountWatchPartyWS(app: any): void {
  // Use the ws object itself as the Map key — it's the same Bun ServerWebSocket
  // instance across open/message/close for the same connection.
  const wsContext = new Map<object, { code: string; userId: string }>();

  app.ws("/api/v1/watch-party/ws", {
    // Declare query params so Elysia validates and exposes them via ws.data.query
    query: t.Object({
      token: t.String(),
      room: t.String({ minLength: 6, maxLength: 6 }),
      // Optional: source reported by the extension (used for mismatch warning)
      source: t.Optional(
        t.Union(ALLOWED_SOURCES.map((s) => t.Literal(s)) as any)
      ),
    }),

    async open(ws: any) {
      const { token, room: code, source } = ws.data.query;

      // Hard block: source must be an allowed platform (rejects direct API abuse)
      if (source && !isAllowedSource(source)) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Plataforma não suportada: ${source}. Use: ${ALLOWED_SOURCES.join(", ")}.`,
          })
        );
        ws.close();
        return;
      }

      const userId = await resolveRawToken(token);
      if (!userId) {
        ws.send(JSON.stringify({ type: "error", message: "Token inválido." }));
        ws.close();
        return;
      }

      const [u] = await db
        .select({ id: user.id, username: user.username, avatarUrl: user.avatarUrl })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!u) {
        ws.send(JSON.stringify({ type: "error", message: "Usuário não encontrado." }));
        ws.close();
        return;
      }

      const username = u.username ?? userId;
      const avatarUrl = u.avatarUrl ?? null;

      // Register context keyed by the ws object reference
      wsContext.set(ws, { code, userId });

      const liveRoom = getRoom(code);

      if (liveRoom?.members.has(userId)) {
        // Reconnecting — update WS handle, cancel host timer if applicable
        const member = liveRoom.members.get(userId)!;
        member.ws = ws;

        if (liveRoom.hostUserId === userId && liveRoom.hostReconnectTimer) {
          clearTimeout(liveRoom.hostReconnectTimer);
          liveRoom.hostReconnectTimer = undefined;
        }

        ws.send(
          JSON.stringify({
            type: "room_state",
            room: serializeRoomPublic(liveRoom),
            members: serializeRoomPublic(liveRoom).members,
            recentMessages: [],
            isHost: userId === liveRoom.hostUserId,
            lastSync: liveRoom.lastSync,
          })
        );
      } else {
        // New join (room in memory or loaded from DB)
        const result = await joinRoom({ code, userId, username, avatarUrl, ws });
        if ("error" in result) {
          ws.send(JSON.stringify({ type: "error", message: result.error }));
          ws.close();
          return;
        }

        // Warn (don't block) if member is on a different platform than the room
        const roomSource = result.room.mediaSource;
        if (source && roomSource && source !== roomSource) {
          ws.send(
            JSON.stringify({
              type: "warning",
              message: `A sala foi criada para ${roomSource}, mas você está em ${source}. A sincronização pode não funcionar.`,
            })
          );
        }
      }
    },

    async message(ws: any, rawMsg: any) {
      const ctx = wsContext.get(ws);
      if (!ctx) return;
      const msg = typeof rawMsg === "string" ? rawMsg : JSON.stringify(rawMsg);
      await handleMessage(ctx.code, ctx.userId, msg);
    },

    async close(ws: any) {
      const ctx = wsContext.get(ws);
      if (!ctx) return;
      wsContext.delete(ws);
      await leaveRoom(ctx.code, ctx.userId);
    },
  });
}
