/**
 * PixelReel — wp-manager.js
 *
 * Módulo ES importado pelo service-worker.js.
 * Gerencia a conexão WebSocket com o backend e o estado da sala de Watch Party.
 *
 * Responsabilidades:
 *  - Abrir / fechar conexão WS com o backend
 *  - Reconnect com backoff exponencial
 *  - Rotear mensagens WS → content script (via chrome.tabs.sendMessage)
 *  - Rotear eventos do content script (host play/pause/seek) → WS
 *  - Manter estado da sala (code, isHost, members)
 */

import { API_BASE } from "../config.js";

// ── Estado ────────────────────────────────────────────────────────────────────

let ws = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let currentRoom = null; // { code, roomId, isHost, members[], title }
let watchPartyTabId = null; // tab onde o streaming está aberto

// ── WebSocket URL ─────────────────────────────────────────────────────────────

function buildWsUrl(token, code, source) {
  // Converte http(s) para ws(s)
  const wsBase = API_BASE.replace(/^http/, "ws");
  const url = `${wsBase}/watch-party/ws?token=${encodeURIComponent(token)}&room=${encodeURIComponent(code)}`;
  return source ? `${url}&source=${encodeURIComponent(source)}` : url;
}

// ── Conectar ──────────────────────────────────────────────────────────────────

function connect(token, code, source) {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  const url = buildWsUrl(token, code, source);
  ws = new WebSocket(url); // eslint-disable-line no-undef

  ws.onopen = () => {
    console.log("[PixelReel WP] WebSocket conectado:", code);
    reconnectAttempts = 0;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  };

  ws.onmessage = async (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    await handleServerMessage(msg);
  };

  ws.onclose = (event) => {
    console.log("[PixelReel WP] WebSocket fechado:", event.code, event.reason);
    ws = null;

    // Não reconectar se foi fechamento intencional (room_ended / leave)
    if (!currentRoom) return;

    scheduleReconnect(token, code, source);
  };

  ws.onerror = (err) => {
    console.error("[PixelReel WP] WebSocket erro:", err);
  };
}

function disconnect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (ws) {
    ws.onclose = null; // evita re-agendamento
    ws.close();
    ws = null;
  }
}

function scheduleReconnect(token, code, source) {
  if (reconnectAttempts >= 10) {
    console.warn("[PixelReel WP] Desistindo de reconectar após", reconnectAttempts, "tentativas");
    currentRoom = null;
    return;
  }
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30_000);
  reconnectAttempts++;
  console.log(`[PixelReel WP] Reconectando em ${delay}ms (tentativa ${reconnectAttempts})`);
  reconnectTimer = setTimeout(() => connect(token, code, source), delay);
}

// ── Enviar mensagem WS ────────────────────────────────────────────────────────

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ── Processar mensagens do servidor ──────────────────────────────────────────

async function handleServerMessage(msg) {
  switch (msg.type) {
    case "room_state": {
      currentRoom = {
        ...currentRoom,
        ...msg.room,
        members: msg.members ?? [],
        isHost: msg.isHost ?? (currentRoom?.isHost ?? false),
      };
      // Avisar o content script para entrar no modo certo
      if (watchPartyTabId) {
        sendToTab({ type: "WP_START", isHost: currentRoom.isHost });
      }
      break;
    }

    case "sync_command": {
      if (watchPartyTabId) {
        sendToTab({ type: "WP_SYNC_COMMAND", ...msg });
      }
      break;
    }

    case "sync_state": {
      if (watchPartyTabId) {
        sendToTab({ type: "WP_SYNC_STATE", ...msg });
      }
      break;
    }

    case "member_joined":
    case "member_left":
    case "member_ready": {
      if (currentRoom && msg.type === "member_joined") {
        currentRoom.members = [...(currentRoom.members ?? []).filter(m => m.userId !== msg.userId), msg];
      } else if (currentRoom && msg.type === "member_left") {
        currentRoom.members = (currentRoom.members ?? []).filter(m => m.userId !== msg.userId);
      }
      break;
    }

    case "host_changed": {
      if (currentRoom) {
        const { userId } = await chrome.storage.local.get(["userId"]);
        currentRoom.isHost = msg.newHostUserId === userId;
        if (watchPartyTabId) {
          sendToTab({ type: "WP_START", isHost: currentRoom.isHost });
        }
      }
      break;
    }

    case "chat_message": {
      // Salvar localmente para o popup exibir
      const { wpMessages = [] } = await chrome.storage.local.get(["wpMessages"]);
      wpMessages.push(msg);
      // Manter apenas as últimas 50 mensagens
      if (wpMessages.length > 50) wpMessages.splice(0, wpMessages.length - 50);
      await chrome.storage.local.set({ wpMessages });
      break;
    }

    case "room_ended": {
      console.log("[PixelReel WP] Sala encerrada pelo host");
      if (watchPartyTabId) sendToTab({ type: "WP_STOP" });
      await cleanupLocalState();
      disconnect();
      break;
    }

    case "error": {
      console.error("[PixelReel WP] Erro do servidor:", msg.message);
      break;
    }
  }
}

// ── Enviar mensagem para o content script ────────────────────────────────────

function sendToTab(msg) {
  if (!watchPartyTabId) return;
  chrome.tabs.sendMessage(watchPartyTabId, msg).catch(() => {
    // Tab pode ter sido fechada ou o content script não está ativo
    watchPartyTabId = null;
  });
}

// ── Limpeza de estado ─────────────────────────────────────────────────────────

async function cleanupLocalState() {
  currentRoom = null;
  watchPartyTabId = null;
  await chrome.storage.local.remove(["wpRoomCode", "wpMessages"]);
}

// ── API Pública (chamada pelo service-worker.js) ──────────────────────────────

export async function wpCreate(params, senderTabId) {
  const { token } = await chrome.storage.local.get("token");
  if (!token) return { error: "Token não configurado." };

  const wsBase = API_BASE.replace(/^ws/, "http"); // garante http para fetch
  const apiBase = API_BASE.startsWith("ws") ? wsBase : API_BASE;

  const res = await fetch(`${apiBase}/watch-party/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.error ?? "Erro ao criar sala." };
  }

  const room = await res.json();

  currentRoom = { ...room, isHost: true, members: [] };
  watchPartyTabId = senderTabId ?? null;

  await chrome.storage.local.set({ wpRoomCode: room.code, wpMessages: [] });

  connect(token, room.code, params.mediaSource);
  return { ok: true, code: room.code, room };
}

export async function wpJoin(code, senderTabId, source) {
  const { token } = await chrome.storage.local.get("token");
  if (!token) return { error: "Token não configurado." };

  currentRoom = { code, isHost: false, members: [] };
  watchPartyTabId = senderTabId ?? null;

  await chrome.storage.local.set({ wpRoomCode: code, wpMessages: [] });

  connect(token, code, source);
  return { ok: true, code };
}

export async function wpLeave() {
  if (watchPartyTabId) sendToTab({ type: "WP_STOP" });
  await cleanupLocalState();
  disconnect();
  return { ok: true };
}

export function wpSendChat(content) {
  send({ type: "chat", content });
  return { ok: true };
}

export function wpGetState() {
  return {
    active: !!currentRoom,
    room: currentRoom,
    tabId: watchPartyTabId,
    connected: ws?.readyState === WebSocket.OPEN,
  };
}

export function wpHandleHostAction(type, payload) {
  // Recebe WP_HOST_PLAY, WP_HOST_PAUSE, WP_HOST_SEEK, WP_HOST_SYNC_STATE
  // e envia pro servidor via WS
  const typeMap = {
    WP_HOST_PLAY: "play",
    WP_HOST_PAUSE: "pause",
    WP_HOST_SEEK: "seek",
    WP_HOST_SYNC_STATE: "sync_state",
  };
  const wsType = typeMap[type];
  if (!wsType) return;
  send({ type: wsType, ...payload });
}
