/**
 * PixelReel Extension — service-worker.js
 *
 * Responsabilidades:
 *  1. Manter alarme periódico para heartbeats.
 *  2. Receber estado dos content scripts via mensagens.
 *  3. Enviar PATCH /api/v1/activity com o token Bearer.
 *  4. Detectar e registrar scrobbles (threshold de progresso).
 *  5. Enviar heartbeat final com status "finished" quando o content script
 *     reporta fim de vídeo ou navegação para fora da página.
 */

import { API_BASE } from "../config.js";
import {
  wpCreate,
  wpJoin,
  wpLeave,
  wpSendChat,
  wpGetState,
  wpHandleHostAction,
} from "./wp-manager.js";

const ALARM_NAME = "pixelreel-heartbeat";
const ALARM_PERIOD_MIN = 0.5; // Mínimo Chrome MV3 (30s)
const SCROBBLE_THRESHOLD = 80; // % de progresso para scrobble

let currentState = null;
let scrobbledTitles = new Set();

// ── Alarme ──────────────────────────────────────────────────────────────────

async function ensureAlarm() {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing)
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MIN });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm();
  console.log("[PixelReel] Extensão instalada.");
});

chrome.runtime.onStartup.addListener(() => ensureAlarm());

// ── Heartbeat ────────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME || !currentState) return;
  await sendHeartbeat(currentState);
});

async function sendHeartbeat(state) {
  const { token } = await chrome.storage.local.get("token");
  const { trackingEnabled } = await chrome.storage.local.get("trackingEnabled");
  if (!token || trackingEnabled === false) return;

  try {
    const res = await fetch(`${API_BASE}/activity`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(state),
    });

    if (!res.ok) {
      console.warn("[PixelReel] Heartbeat falhou:", res.status);
      return;
    }

    const data = await res.json();

    const shouldScrobble =
      data.scrobbled ||
      (state.progress != null && state.progress >= SCROBBLE_THRESHOLD);

    const key = `${state.source}::${state.title}::${state.season ?? ""}::${state.episode ?? ""}`;

    if (shouldScrobble && !scrobbledTitles.has(key)) {
      scrobbledTitles.add(key);
      console.log("[PixelReel] 🎬 Scrobble:", state.title);
    }
  } catch (err) {
    console.error("[PixelReel] Erro de rede:", err);
  }
}

// ── Mensagens ────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "ACTIVITY_UPDATE": {
      const incoming = message.payload;
      if (currentState?.title !== incoming.title) scrobbledTitles.clear();

      const isFirstDetect = !currentState;
      currentState = incoming;

      // Sempre envia heartbeat quando o status muda (watching/paused/finished)
      // e no primeiro detect
      const statusChanged =
        isFirstDetect || currentState?.status !== incoming.status;

      if (isFirstDetect || incoming.status === "finished" || statusChanged) {
        sendHeartbeat(incoming).then(() => {
          // Se terminou, limpa o state local
          if (incoming.status === "finished") {
            currentState = null;
          }
          sendResponse({ ok: true });
        });
        return true; // async response
      }

      sendResponse({ ok: true });
      break;
    }

    case "ACTIVITY_CLEAR": {
      // O content script envia o último payload quando o usuário navega pra fora.
      // Enviamos um heartbeat final com o STATUS REAL (paused/watching) — nunca forçamos "finished".
      // "finished" só é enviado pelo content script quando video.ended === true ou progress >= 98%.
      const lastPayload = message.lastPayload;

      if (lastPayload && lastPayload.title) {
        sendHeartbeat(lastPayload).then(() => {
          currentState = null;
          scrobbledTitles.clear();
          sendResponse({ ok: true });
        });
        return true; // async response
      }

      // Sem lastPayload, apenas limpa
      currentState = null;
      scrobbledTitles.clear();
      sendResponse({ ok: true });
      break;
    }

    case "GET_STATUS":
      sendResponse({ state: currentState });
      break;

    // ── Watch Party ─────────────────────────────────────────────────────────

    case "WP_CREATE_ROOM": {
      // Inject the current source from activity tracking if not provided explicitly
      const params = {
        ...message.params,
        mediaSource: message.params.mediaSource ?? currentState?.source,
      };
      wpCreate(params, _sender?.tab?.id).then(sendResponse);
      return true;
    }

    case "WP_JOIN_ROOM": {
      // Pass current source (from activity tracking) so the server can warn on mismatch
      wpJoin(message.code, _sender?.tab?.id, currentState?.source ?? message.source).then(sendResponse);
      return true;
    }

    case "WP_LEAVE_ROOM": {
      wpLeave().then(sendResponse);
      return true;
    }

    case "WP_SEND_CHAT": {
      sendResponse(wpSendChat(message.content));
      break;
    }

    case "WP_GET_STATE": {
      sendResponse(wpGetState());
      break;
    }

    case "WP_HOST_PLAY":
    case "WP_HOST_PAUSE":
    case "WP_HOST_SEEK":
    case "WP_HOST_SYNC_STATE": {
      wpHandleHostAction(message.type, message);
      sendResponse({ ok: true });
      break;
    }

    default:
      sendResponse({ ok: false, error: "Mensagem desconhecida" });
  }
});
