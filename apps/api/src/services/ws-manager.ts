/**
 * In-memory WebSocket connection manager.
 *
 * Maps userId → Set of open WebSocket connections (one user can have multiple tabs/devices).
 * Since the API runs as a single Bun process, this is sufficient for MVP.
 * For horizontal scaling, replace with Redis pub/sub.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WsSocket = any;

const connections = new Map<string, Set<WsSocket>>();

/** Anonymous (unauthenticated) connections — receive broadcasts but cannot send. */
const anonymousConnections = new Set<WsSocket>();

export function addAnonymousConnection(ws: WsSocket): void {
  anonymousConnections.add(ws);
}

export function removeAnonymousConnection(ws: WsSocket): void {
  anonymousConnections.delete(ws);
}

export function addConnection(userId: string, ws: WsSocket): void {
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId)!.add(ws);
}

export function removeConnection(userId: string, ws: WsSocket): void {
  const sockets = connections.get(userId);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) connections.delete(userId);
}

export function isOnline(userId: string): boolean {
  const sockets = connections.get(userId);
  return !!sockets && sockets.size > 0;
}

/** Send an event to all open sockets of a specific user. */
export function sendToUser(userId: string, event: object): void {
  const sockets = connections.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify(event);
  for (const ws of sockets) {
    try {
      ws.send(payload);
    } catch {
      // socket may have closed between check and send — ignore
    }
  }
}

/** Broadcast an event to every connected user (authenticated + anonymous), optionally excluding one. */
export function broadcastToAll(event: object, excludeUserId?: string): void {
  const payload = JSON.stringify(event);

  for (const [uid, sockets] of connections) {
    if (uid === excludeUserId) continue;
    for (const ws of sockets) {
      try { ws.send(payload); } catch { /* closed */ }
    }
  }

  for (const ws of anonymousConnections) {
    try { ws.send(payload); } catch { /* closed */ }
  }
}

/**
 * Broadcast an event to all participants of a conversation,
 * optionally excluding the sender (e.g. so the sender doesn't receive their own message twice).
 */
export function broadcastToConversation(
  participantIds: string[],
  event: object,
  excludeUserId?: string
): void {
  for (const uid of participantIds) {
    if (uid === excludeUserId) continue;
    sendToUser(uid, event);
  }
}
