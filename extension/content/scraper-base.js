/**
 * PixelReel — scraper-base.js
 *
 * Factory compartilhada por todos os content scripts.
 * Estratégia: API interna da plataforma primeiro, DOM como fallback.
 *
 * NOTA: Content scripts do Chrome NÃO suportam ES modules.
 * Este arquivo é injetado ANTES dos scrapers via manifest.json
 * e expõe window.createScraper como função global.
 */
window.createScraper = function ({
  source,
  fetchInfo,
  getTitle,
  getSubtitle,
  parseSeasonEpisode,
}) {
  const POLL_MS = 10_000;
  let pollInterval = null;
  let lastPayload = null; // último payload enviado (para detectar mudança)
  let lastHref = location.href;
  let dead = false;

  // ── Guard contra "Extension context invalidated" ────────────────────────────

  function isAlive() {
    if (dead) return false;
    try {
      return !!chrome.runtime?.id;
    } catch {
      dead = true;
      return false;
    }
  }

  function shutdown() {
    dead = true;
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    try {
      spaObserver.disconnect();
    } catch {}
    try {
      window.removeEventListener("beforeunload", onUnload);
    } catch {}
  }

  // ── Mensagens ───────────────────────────────────────────────────────────────

  function send(msg) {
    if (!isAlive()) return;
    try {
      chrome.runtime.sendMessage(msg).catch((err) => {
        if (err?.message?.includes("Extension context invalidated")) shutdown();
      });
    } catch (err) {
      if (err?.message?.includes("Extension context invalidated")) shutdown();
    }
  }

  // ── Parser padrão de temporada/episódio ────────────────────────────────────

  function defaultParseSeasonEpisode(sub) {
    if (!sub) return { season: null, episode: null };
    const match =
      sub.match(/S(\d+)\s*[:\-·]?\s*E(\d+)/i) ||
      sub.match(/Season\s+(\d+)[^\d]+(?:Ep\.?\s*|Episode\s+)(\d+)/i);
    if (!match) return { season: null, episode: null };
    return { season: parseInt(match[1], 10), episode: parseInt(match[2], 10) };
  }

  const extractSE = parseSeasonEpisode ?? defaultParseSeasonEpisode;

  // ── Seleciona o <video> ativo (ignora elementos ocultos) ──────────────────
  // Disney+ (e outros) renderizam dois <video>: um oculto (display:none)
  // e o real. querySelector("video") sempre pega o primeiro — o errado.

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

  // ── Coleta via API interna (estratégia primária) ───────────────────────────

  async function collectViaApi() {
    if (!fetchInfo) return null;
    try {
      const info = await fetchInfo();
      if (!info?.title) return null;

      const video = getActiveVideo();

      if (info.progress == null && video && video.duration > 0) {
        info.progress = Math.round((video.currentTime / video.duration) * 100);
      }

      // Detectar status do vídeo
      if (video) {
        if (video.ended || (info.progress != null && info.progress >= 98)) {
          info.status = "finished";
        } else if (video.paused) {
          info.status = "paused";
        } else {
          info.status = info.status ?? "watching";
        }
      }

      return {
        title: info.title,
        season: info.season ?? null,
        episode: info.episode ?? null,
        progress: info.progress ?? null,
        source,
        status: info.status ?? "watching",
        media_type:
          info.media_type ?? (info.season != null ? "episode" : "movie"),
      };
    } catch {
      return null;
    }
  }

  // ── Coleta via DOM (fallback) ──────────────────────────────────────────────
  // IMPORTANTE: NÃO retorna null quando pausado/ended — em vez disso,
  // retorna o payload com status "paused" ou "finished".

  function collectViaDom() {
    try {
      const video = getActiveVideo();
      if (!video || video.readyState < 2) return null;

      const title = getTitle?.()?.trim();
      if (!title) return null;

      const progress =
        video.duration > 0
          ? Math.round((video.currentTime / video.duration) * 100)
          : null;

      const { season, episode } = extractSE(getSubtitle?.() ?? null);

      let status = "watching";
      if (video.ended || (progress != null && progress >= 98)) {
        status = "finished";
      } else if (video.paused) {
        status = "paused";
      }

      return {
        title,
        season,
        episode,
        progress,
        source,
        status,
        media_type: season != null ? "episode" : "movie",
      };
    } catch {
      return null;
    }
  }

  // ── Ciclo de coleta ────────────────────────────────────────────────────────

  async function collect() {
    return (await collectViaApi()) ?? collectViaDom();
  }

  // ── Polling ────────────────────────────────────────────────────────────────

  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      if (!isAlive()) {
        shutdown();
        return;
      }
      try {
        const payload = await collect();

        if (payload) {
          // Sempre envia o update (watching, paused ou finished)
          send({ type: "ACTIVITY_UPDATE", payload });
          lastPayload = payload;

          // Se finished, para de enviar repetidamente
          if (payload.status === "finished") {
            // Envia uma última vez e para o polling
            clearInterval(pollInterval);
            pollInterval = null;
          }
        } else if (lastPayload) {
          // Vídeo sumiu do DOM (navegação), avisa o service worker
          send({ type: "ACTIVITY_CLEAR", lastPayload });
          lastPayload = null;
        }
      } catch (err) {
        if (err?.message?.includes("Extension context invalidated")) shutdown();
      }
    }, POLL_MS);
  }

  function stopPolling() {
    if (!pollInterval) return;
    clearInterval(pollInterval);
    pollInterval = null;
    if (lastPayload) {
      send({ type: "ACTIVITY_CLEAR", lastPayload });
      lastPayload = null;
    }
  }

  // ── Aguarda <video> aparecer ───────────────────────────────────────────────

  function waitForVideo() {
    if (fetchInfo || getActiveVideo()) {
      startPolling();
      return;
    }
    const videoObserver = new MutationObserver(() => {
      try {
        if (!isAlive()) {
          videoObserver.disconnect();
          return;
        }
        if (getActiveVideo()) {
          videoObserver.disconnect();
          startPolling();
        }
      } catch (err) {
        if (err?.message?.includes("Extension context invalidated")) {
          videoObserver.disconnect();
          shutdown();
        }
      }
    });
    videoObserver.observe(document.body, { childList: true, subtree: true });
  }

  // ── Navegação SPA ──────────────────────────────────────────────────────────

  const spaObserver = new MutationObserver(() => {
    try {
      if (!isAlive()) {
        shutdown();
        return;
      }
      if (location.href !== lastHref) {
        lastHref = location.href;
        stopPolling();
        waitForVideo();
      }
    } catch (err) {
      if (err?.message?.includes("Extension context invalidated")) shutdown();
    }
  });

  try {
    spaObserver.observe(document.body, { childList: true, subtree: true });
  } catch {}

  // ── Limpeza ────────────────────────────────────────────────────────────────

  function onUnload() {
    try {
      stopPolling();
    } catch {}
  }
  window.addEventListener("beforeunload", onUnload);

  // ── Inicia ─────────────────────────────────────────────────────────────────
  waitForVideo();
};
