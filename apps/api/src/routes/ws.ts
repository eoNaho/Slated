import { Elysia } from "elysia";
import { auth } from "../auth";
import {
  db,
  conversationParticipants,
  eq,
  and,
  isNull,
} from "../db";
import {
  addConnection,
  removeConnection,
  addAnonymousConnection,
  removeAnonymousConnection,
  broadcastToConversation,
} from "../services/ws-manager";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientEvent =
  | { type: "typing"; conversationId: string }
  | { type: "stop_typing"; conversationId: string }
  | { type: "ping" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getParticipantIds(conversationId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        isNull(conversationParticipants.leftAt)
      )
    );
  return rows.map((r) => r.userId);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const wsRoutes = new Elysia().ws("/ws", {
  async open(ws) {
    // Authenticate via session cookie from the upgrade request
    const session = await auth.api.getSession({
      headers: ws.data.request.headers,
    });

    if (!session) {
      // Allow unauthenticated connections — they can receive broadcasts (e.g. announcements)
      // but cannot send authenticated events (messages, typing, etc.)
      (ws.data as Record<string, unknown>).userId = null;
      addAnonymousConnection(ws);
      return;
    }

    const userId = session.user.id;
    (ws.data as Record<string, unknown>).userId = userId;
    addConnection(userId, ws);
  },

  async message(ws, rawMessage) {
    const userId = (ws.data as Record<string, unknown>).userId as string | undefined;
    if (!userId) return;

    let event: ClientEvent;
    try {
      event =
        typeof rawMessage === "string"
          ? JSON.parse(rawMessage)
          : (rawMessage as ClientEvent);
    } catch {
      return;
    }

    switch (event.type) {
      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;

      case "typing":
      case "stop_typing": {
        const { conversationId } = event;
        if (!conversationId) break;

        // Verify the sender is actually a participant
        const [row] = await db
          .select({ userId: conversationParticipants.userId })
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              eq(conversationParticipants.userId, userId),
              isNull(conversationParticipants.leftAt)
            )
          );

        if (!row) break;

        const participantIds = await getParticipantIds(conversationId);

        broadcastToConversation(
          participantIds,
          {
            type: "typing",
            conversationId,
            userId,
            isTyping: event.type === "typing",
          },
          userId // don't send back to the typist
        );
        break;
      }
    }
  },

  close(ws) {
    const userId = (ws.data as Record<string, unknown>).userId as string | null | undefined;
    if (userId) removeConnection(userId, ws);
    else removeAnonymousConnection(ws);
  },
});
