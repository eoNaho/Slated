import { db } from "../db";
import {
  watchPartyRooms,
  watchPartyMembers,
} from "../db/schema";
import { eq, and, lt } from "drizzle-orm";
import { logger } from "../utils/logger";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SyncState {
  currentTime: number;
  paused: boolean;
  playbackRate: number;
  serverTimestamp: number;
}

export interface MemberState {
  userId: string;
  username: string;
  avatarUrl: string | null;
  ws: any; // Elysia ServerWebSocket
  ready: boolean;
  joinedAt: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
}

export interface RoomState {
  id: string;
  code: string;
  hostUserId: string;
  title: string;
  mediaTitle: string | null;
  mediaSource: string | null;
  mediaUrl: string | null;
  maxMembers: number;
  status: "waiting" | "active" | "ended";
  members: Map<string, MemberState>;
  lastSync: SyncState | null;
  /** Whether the host is currently streaming video via WebRTC */
  streamActive: boolean;
  /** Last 50 chat messages — in-memory only, cleared when room ends */
  messages: ChatMessage[];
  createdAt: Date;
  // Timer to promote host when disconnected
  hostReconnectTimer?: ReturnType<typeof setTimeout>;
}

// ─── In-Memory Store ──────────────────────────────────────────────────────────

const rooms = new Map<string, RoomState>();

// ─── Code Generator ───────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function generateUniqueCode(): Promise<string> {
  let code = generateCode();
  let attempts = 0;
  while (rooms.has(code) && attempts < 10) {
    code = generateCode();
    attempts++;
  }
  return code;
}

// ─── Broadcast ───────────────────────────────────────────────────────────────

export function broadcast(
  room: RoomState,
  message: object,
  excludeUserId?: string
): void {
  const payload = JSON.stringify(message);
  for (const [userId, member] of room.members) {
    if (userId === excludeUserId) continue;
    try {
      member.ws.send(payload);
    } catch {
      // WS already closed — will be cleaned up on close event
    }
  }
}

function sendToUser(member: MemberState, message: object): void {
  try {
    member.ws.send(JSON.stringify(message));
  } catch {}
}

// ─── Room Lifecycle ──────────────────────────────────────────────────────────

export async function createRoom(params: {
  hostUserId: string;
  hostUsername: string;
  hostAvatarUrl: string | null;
  title: string;
  mediaTitle?: string;
  mediaSource?: string;
  mediaUrl?: string;
  ws: any;
}): Promise<RoomState> {
  const code = await generateUniqueCode();

  const [row] = await db
    .insert(watchPartyRooms)
    .values({
      code,
      hostUserId: params.hostUserId,
      title: params.title,
      mediaTitle: params.mediaTitle ?? null,
      mediaSource: params.mediaSource ?? null,
      mediaUrl: params.mediaUrl ?? null,
      status: "waiting",
    })
    .returning();

  // Record host as first member
  await db.insert(watchPartyMembers).values({
    roomId: row.id,
    userId: params.hostUserId,
  });

  const room: RoomState = {
    id: row.id,
    code,
    hostUserId: params.hostUserId,
    title: params.title,
    mediaTitle: params.mediaTitle ?? null,
    mediaSource: params.mediaSource ?? null,
    mediaUrl: params.mediaUrl ?? null,
    maxMembers: 8,
    status: "waiting",
    members: new Map([
      [
        params.hostUserId,
        {
          userId: params.hostUserId,
          username: params.hostUsername,
          avatarUrl: params.hostAvatarUrl,
          ws: params.ws,
          ready: false,
          joinedAt: new Date(),
        },
      ],
    ]),
    lastSync: null,
    streamActive: false,
    messages: [],
    createdAt: new Date(),
  };

  rooms.set(code, room);

  // Send initial room_state to host
  sendToUser(room.members.get(params.hostUserId)!, {
    type: "room_state",
    room: serializeRoom(room),
    members: serializeMembers(room),
    recentMessages: [],
  });

  logger.info({ code, hostUserId: params.hostUserId }, "Watch party room created");
  return room;
}

export async function joinRoom(params: {
  code: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  ws: any;
}): Promise<{ room: RoomState } | { error: string }> {
  let room = rooms.get(params.code);

  // Load from DB if not in memory (e.g. server restart)
  if (!room) {
    const [row] = await db
      .select()
      .from(watchPartyRooms)
      .where(eq(watchPartyRooms.code, params.code))
      .limit(1);

    if (!row) return { error: "Sala não encontrada." };
    if (row.status === "ended") return { error: "Esta sala já foi encerrada." };

    room = {
      id: row.id,
      code: row.code,
      hostUserId: row.hostUserId,
      title: row.title,
      mediaTitle: row.mediaTitle,
      mediaSource: row.mediaSource,
      mediaUrl: row.mediaUrl,
      maxMembers: row.maxMembers,
      status: row.status as "waiting" | "active" | "ended",
      members: new Map(),
      lastSync: null,
      streamActive: false,
      messages: [],
      createdAt: row.createdAt,
    };
    rooms.set(row.code, room);
  }

  if (room.status === "ended") return { error: "Esta sala já foi encerrada." };
  if (room.members.size >= room.maxMembers) {
    return { error: "A sala está cheia." };
  }

  const member: MemberState = {
    userId: params.userId,
    username: params.username,
    avatarUrl: params.avatarUrl,
    ws: params.ws,
    ready: false,
    joinedAt: new Date(),
  };

  room.members.set(params.userId, member);

  // Upsert DB membership
  await db
    .insert(watchPartyMembers)
    .values({ roomId: room.id, userId: params.userId })
    .onConflictDoUpdate({
      target: [watchPartyMembers.roomId, watchPartyMembers.userId],
      set: { joinedAt: new Date(), leftAt: null },
    });

  // Send room state to the new member (including last messages for late-joiners)
  sendToUser(member, {
    type: "room_state",
    room: serializeRoom(room),
    members: serializeMembers(room),
    recentMessages: room.messages,
    isHost: params.userId === room.hostUserId,
    lastSync: room.lastSync,
  });

  // Notify others
  broadcast(room, {
    type: "member_joined",
    userId: params.userId,
    username: params.username,
    avatarUrl: params.avatarUrl,
  }, params.userId);

  logger.info({ code: params.code, userId: params.userId }, "User joined watch party");
  return { room };
}

export async function leaveRoom(code: string, userId: string): Promise<void> {
  const room = rooms.get(code);
  if (!room) return;

  room.members.delete(userId);

  // Update DB
  await db
    .update(watchPartyMembers)
    .set({ leftAt: new Date() })
    .where(
      and(
        eq(watchPartyMembers.roomId, room.id),
        eq(watchPartyMembers.userId, userId)
      )
    );

  broadcast(room, { type: "member_left", userId });

  // If host left, start reconnect timer
  if (userId === room.hostUserId) {
    if (room.hostReconnectTimer) clearTimeout(room.hostReconnectTimer);
    room.hostReconnectTimer = setTimeout(() => {
      promoteNewHost(room);
    }, 30_000); // 30s grace period
  }

  // If room is empty, schedule cleanup
  if (room.members.size === 0) {
    setTimeout(() => {
      cleanupEmptyRoom(code);
    }, 5 * 60_000); // 5 minutes
  }

  logger.info({ code, userId }, "User left watch party");
}

function promoteNewHost(room: RoomState): void {
  if (room.status === "ended") return;

  // Find oldest remaining member
  let newHost: MemberState | null = null;
  for (const member of room.members.values()) {
    if (!newHost || member.joinedAt < newHost.joinedAt) {
      newHost = member;
    }
  }

  if (!newHost) {
    // No members left, cleanup
    cleanupEmptyRoom(room.code);
    return;
  }

  room.hostUserId = newHost.userId;

  // Update DB
  db.update(watchPartyRooms)
    .set({ hostUserId: newHost.userId })
    .where(eq(watchPartyRooms.id, room.id))
    .catch(() => {});

  broadcast(room, {
    type: "host_changed",
    newHostUserId: newHost.userId,
  });

  logger.info({ code: room.code, newHostUserId: newHost.userId }, "Watch party host promoted");
}

export async function endRoom(code: string, userId: string): Promise<{ error?: string }> {
  const room = rooms.get(code);
  if (!room) return { error: "Sala não encontrada." };
  if (room.hostUserId !== userId) return { error: "Apenas o host pode encerrar a sala." };

  room.status = "ended";

  broadcast(room, { type: "room_ended" });

  // Close all WS connections
  for (const member of room.members.values()) {
    try {
      member.ws.close();
    } catch {}
  }

  room.members.clear();
  rooms.delete(code);

  await db
    .update(watchPartyRooms)
    .set({ status: "ended", endedAt: new Date() })
    .where(eq(watchPartyRooms.id, room.id));

  logger.info({ code, userId }, "Watch party room ended");
  return {};
}

async function cleanupEmptyRoom(code: string): Promise<void> {
  const room = rooms.get(code);
  if (!room || room.members.size > 0) return;

  rooms.delete(code);

  await db
    .update(watchPartyRooms)
    .set({ status: "ended", endedAt: new Date() })
    .where(and(eq(watchPartyRooms.code, code), eq(watchPartyRooms.status, "waiting")));

  logger.info({ code }, "Empty watch party room cleaned up");
}

// ─── Message Handler ──────────────────────────────────────────────────────────

export async function handleMessage(
  code: string,
  userId: string,
  rawMessage: string
): Promise<void> {
  const room = rooms.get(code);
  if (!room) return;

  const member = room.members.get(userId);
  if (!member) return;

  let msg: any;
  try {
    msg = JSON.parse(rawMessage);
  } catch {
    return;
  }

  const isHost = userId === room.hostUserId;

  switch (msg.type) {
    case "chat": {
      const content = String(msg.content ?? "").trim().slice(0, 500);
      if (!content) return;

      const chatMsg: ChatMessage = {
        id: crypto.randomUUID(),
        userId,
        username: member.username,
        avatarUrl: member.avatarUrl,
        content,
        createdAt: new Date().toISOString(),
      };

      // Keep last 50 messages in memory so late-joiners can catch up
      room.messages.push(chatMsg);
      if (room.messages.length > 50) room.messages.shift();

      broadcast(room, { type: "chat_message", ...chatMsg });
      break;
    }

    case "ready": {
      member.ready = !!msg.ready;
      broadcast(room, {
        type: "member_ready",
        userId,
        ready: member.ready,
      });
      break;
    }

    // ── WebRTC signaling relay ────────────────────────────────────────────
    // The server is a dumb relay — it never inspects SDP/ICE content.

    case "webrtc_stream_start": {
      if (!isHost) return;
      room.streamActive = true;
      if (room.status === "waiting") {
        room.status = "active";
        db.update(watchPartyRooms)
          .set({ status: "active" })
          .where(eq(watchPartyRooms.id, room.id))
          .catch(() => {});
      }
      broadcast(room, { type: "webrtc_stream_started" }, userId);
      break;
    }

    case "webrtc_stream_end": {
      if (!isHost) return;
      room.streamActive = false;
      broadcast(room, { type: "webrtc_stream_ended" }, userId);
      break;
    }

    case "webrtc_viewer_ready": {
      // Viewer signals they're ready to receive stream — relay to host
      const host = room.members.get(room.hostUserId);
      if (host) sendToUser(host, { type: "webrtc_viewer_ready", viewerId: userId });
      break;
    }

    case "webrtc_offer": {
      // Host → specific viewer
      if (!isHost) return;
      const target = room.members.get(msg.targetUserId);
      if (target) sendToUser(target, { ...msg, fromUserId: userId });
      break;
    }

    case "webrtc_answer": {
      // Viewer → host
      const host = room.members.get(room.hostUserId);
      if (host) sendToUser(host, { ...msg, fromUserId: userId });
      break;
    }

    case "webrtc_ice": {
      // Relay ICE candidate to the specified target
      const iceTarget = room.members.get(msg.targetUserId);
      if (iceTarget) sendToUser(iceTarget, { ...msg, fromUserId: userId });
      break;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeRoom(room: RoomState) {
  return {
    id: room.id,
    code: room.code,
    hostUserId: room.hostUserId,
    title: room.title,
    mediaTitle: room.mediaTitle,
    mediaSource: room.mediaSource,
    mediaUrl: room.mediaUrl,
    status: room.status,
    streamActive: room.streamActive,
    createdAt: room.createdAt,
  };
}

function serializeMembers(room: RoomState) {
  return Array.from(room.members.values()).map((m) => ({
    userId: m.userId,
    username: m.username,
    avatarUrl: m.avatarUrl,
    ready: m.ready,
    isHost: m.userId === room.hostUserId,
  }));
}

// ─── Stale Room Cleanup (called by cron) ─────────────────────────────────────

export async function cleanupStaleRooms(): Promise<void> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60_000);

  // End empty in-memory rooms
  for (const [code, room] of rooms) {
    if (room.members.size === 0 && room.createdAt < fiveMinutesAgo) {
      rooms.delete(code);
    }
  }

  // End stale DB rooms (waiting for >24h)
  await db
    .update(watchPartyRooms)
    .set({ status: "ended", endedAt: new Date() })
    .where(
      and(
        eq(watchPartyRooms.status, "waiting"),
        lt(watchPartyRooms.createdAt, oneDayAgo)
      )
    );

  logger.info("Watch party stale room cleanup complete");
}

// ─── Exports for WS route ────────────────────────────────────────────────────

export function getRoom(code: string): RoomState | undefined {
  return rooms.get(code);
}

export function serializeRoomPublic(room: RoomState) {
  return { ...serializeRoom(room), members: serializeMembers(room) };
}
