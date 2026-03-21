/**
 * PixelReel — watch-party-sync.js
 *
 * Content script injetado em todas as plataformas de streaming.
 * Fica INATIVO por padrão — só começa a agir quando o service worker
 * envia WP_START com { isHost: bool }.
 *
 * Coexiste com scraper-base.js: o scraper lê o vídeo (read-only),
 * este script lê E ESCREVE (para sync). Ambos usam getActiveVideo().
 *
 * NOTA: Este arquivo é injetado como plain script (não ES module).
 * É carregado APÓS scraper-base.js (que expõe window.getActiveVideo
 * via window.createScraper), mas precisamos de getActiveVideo diretamente.
 * Definimos nossa própria cópia local para não depender da instância do scraper.
 */

(function () {
  "use strict";

  // ── Estado ──────────────────────────────────────────────────────────────────

  let wpActive = false;
  let isHost = false;
  let hostListeners = null; // cleanup para event listeners do host
  let syncInterval = null;
  let ignoreNextEvent = false; // evita loop: nós mesmos causamos o evento

  // ── Utilidade: encontrar o <video> ativo ────────────────────────────────────
  // Cópia de getActiveVideo() de scraper-base.js para não depender da instância.

  function getActiveVideo() {
    const all = Array.from(document.querySelectorAll("video"));
    return (
      all.find((v) => !v.paused && v.readyState >= 2) ||
      all.find((v) => v.src && getComputedStyle(v).display !== "none") ||
      all.find((v) => v.src) ||
      all[0] ||
      null
    );
  }

  // ── Envio para o service worker ─────────────────────────────────────────────

  function sendToSW(msg) {
    try {
      chrome.runtime.sendMessage(msg).catch(() => {});
    } catch {}
  }

  // ── Modo HOST: captura eventos e envia para o SW ────────────────────────────

  function startHostMode() {
    const video = getActiveVideo();
    if (!video) {
      // Tentar de novo em 1s se o vídeo ainda não apareceu
      setTimeout(startHostMode, 1000);
      return;
    }

    const onPlay = () => {
      if (ignoreNextEvent) { ignoreNextEvent = false; return; }
      sendToSW({ type: "WP_HOST_PLAY", currentTime: video.currentTime });
    };

    const onPause = () => {
      if (ignoreNextEvent) { ignoreNextEvent = false; return; }
      sendToSW({ type: "WP_HOST_PAUSE", currentTime: video.currentTime });
    };

    const onSeeked = () => {
      if (ignoreNextEvent) { ignoreNextEvent = false; return; }
      sendToSW({ type: "WP_HOST_SEEK", currentTime: video.currentTime });
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);

    // Sync state periódico a cada 2s (para correção de drift nos membros)
    syncInterval = setInterval(() => {
      const v = getActiveVideo();
      if (!v) return;
      sendToSW({
        type: "WP_HOST_SYNC_STATE",
        currentTime: v.currentTime,
        paused: v.paused,
        playbackRate: v.playbackRate,
      });
    }, 2000);

    // Guardar cleanup
    hostListeners = () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
    };
  }

  function stopHostMode() {
    if (hostListeners) { hostListeners(); hostListeners = null; }
    if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  }

  // ── Modo MEMBER: aplica comandos de sync no vídeo ──────────────────────────

  const DRIFT_THRESHOLD_S = 2; // seek se drift > 2 segundos

  function applyCommand(cmd) {
    const video = getActiveVideo();
    if (!video) return;

    ignoreNextEvent = true; // evita que o evento dispare de volta para o host

    switch (cmd.action) {
      case "play": {
        // Compensar latência de rede
        const expected = cmd.currentTime + (Date.now() - cmd.serverTimestamp) / 1000;
        video.currentTime = expected;
        video.play().catch(() => {});
        break;
      }
      case "pause": {
        video.currentTime = cmd.currentTime;
        video.pause();
        break;
      }
      case "seek": {
        video.currentTime = cmd.currentTime;
        break;
      }
    }

    // Libera a flag após o evento ser disparado
    setTimeout(() => { ignoreNextEvent = false; }, 300);
  }

  function applySyncState(state) {
    const video = getActiveVideo();
    if (!video || video.paused !== state.paused) return; // só corrige drift se mesmo estado

    const expected = state.currentTime + (Date.now() - state.serverTimestamp) / 1000;
    const drift = Math.abs(video.currentTime - expected);

    if (drift > DRIFT_THRESHOLD_S) {
      ignoreNextEvent = true;
      video.currentTime = expected;
      setTimeout(() => { ignoreNextEvent = false; }, 300);
    }
  }

  // ── Listener de mensagens do service worker ─────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case "WP_START": {
        wpActive = true;
        isHost = !!message.isHost;
        if (isHost) {
          startHostMode();
        }
        sendResponse({ ok: true });
        break;
      }

      case "WP_STOP": {
        wpActive = false;
        if (isHost) stopHostMode();
        isHost = false;
        sendResponse({ ok: true });
        break;
      }

      case "WP_SYNC_COMMAND": {
        if (!wpActive || isHost) break; // host não aplica comandos
        applyCommand(message);
        sendResponse({ ok: true });
        break;
      }

      case "WP_SYNC_STATE": {
        if (!wpActive || isHost) break;
        applySyncState(message);
        sendResponse({ ok: true });
        break;
      }
    }
  });
})();
