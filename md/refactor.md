# PixelReel Extension — Refatoração Completa

## O que muda e por quê

O PreMiD HBO Max não raspa DOM — ele faz `fetch` para a API interna da
plataforma usando `credentials: 'include'`, aproveitando os cookies de sessão
do usuário. O resultado é JSON estruturado com título, temporada e episódio,
sem depender de seletores CSS que quebram a cada redesign.

### Nova estratégia: API first, DOM fallback

```
1. Tenta fetchInfo() → API interna da plataforma (dados estruturados)
2. Se falhar ou retornar null → fallback para DOM scraping
3. Se DOM também falhar → silêncio (sem crash)
```

### Plataformas e suas APIs internas

| Plataforma | Estratégia primária                                      |
| ---------- | -------------------------------------------------------- |
| Netflix    | `netflix.com/api/shakti/{buildId}/metadata?movieid={id}` |
| HBO Max    | `hbomax.com/cms/routes{pathname}?include=default`        |
| Disney+    | `bamgrid.com/svc/content/DmcVideoBundle/...`             |
| Prime      | DOM (API requer token extra complexo — mantém scraping)  |

---

## Estrutura de arquivos

```
extension/
├── background/
│   └── service-worker.js
├── content/
│   ├── scraper-base.js       ← engine compartilhada (API + DOM + guard)
│   ├── netflix.js
│   ├── prime.js
│   ├── disney.js
│   └── hbo.js
├── popup/
│   ├── popup.css             (sem alteração)
│   ├── popup.html
│   └── popup.js
├── config.js                 ← URLs centralizadas (DEV flag)
├── manifest.json
└── README.md
```

---

## manifest.json

Adicionar `"host_permissions"` para que os content scripts possam fazer
`fetch` para as APIs internas das plataformas.

```json
{
  "manifest_version": 3,
  "name": "PixelReel",
  "version": "1.0.0",
  "description": "Rastreia o que você está assistindo e sincroniza com seu perfil PixelReel.",
  "permissions": ["storage", "alarms"],
  "host_permissions": [
    "*://*.netflix.com/*",
    "*://*.hbomax.com/*",
    "*://*.max.com/*",
    "*://*.disneyplus.com/*",
    "*://*.primevideo.com/*",
    "*://*.bamgrid.com/*",
    "http://localhost:3001/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["*://*.netflix.com/*"],
      "js": ["content/netflix.js"],
      "type": "module"
    },
    {
      "matches": ["*://*.primevideo.com/*"],
      "js": ["content/prime.js"],
      "type": "module"
    },
    {
      "matches": ["*://*.disneyplus.com/*"],
      "js": ["content/disney.js"],
      "type": "module"
    },
    {
      "matches": ["*://*.hbomax.com/*", "*://*.max.com/*"],
      "js": ["content/hbo.js"],
      "type": "module"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "48": "icons/icon-48.png"
    }
  },
  "icons": {
    "48": "icons/icon-48.png"
  }
}
```

---

## config.js

```js
/**
 * PixelReel — config.js
 * Troque DEV para false antes de publicar na Chrome Web Store.
 */

const DEV = true;

export const API_BASE = DEV
  ? "http://localhost:3001/api/v1"
  : "https://pixelreel.com/api/v1";
export const SITE_BASE = DEV
  ? "http://localhost:3000"
  : "https://pixelreel.com";
```

---

## content/scraper-base.js

Engine compartilhada. Suporta `fetchInfo` (API) e DOM como fallback.
Inclui guard completo contra "Extension context invalidated".

```js
/**
 * PixelReel — scraper-base.js
 *
 * Factory compartilhada por todos os content scripts.
 * Estratégia: API interna da plataforma primeiro, DOM como fallback.
 *
 * @param {object}    config
 * @param {string}    config.source              - "netflix" | "prime" | "disney" | "max"
 * @param {function}  [config.fetchInfo]         - async () => ScrapedInfo | null
 *                    Busca dados via API interna da plataforma.
 *                    Se ausente ou retornar null, usa DOM scraping.
 * @param {function}  [config.getTitle]          - () => string | null  (fallback DOM)
 * @param {function}  [config.getSubtitle]       - () => string | null  (fallback DOM)
 * @param {function}  [config.parseSeasonEpisode]- (subtitle) => { season, episode } | null
 *
 * ScrapedInfo: { title, season?, episode?, progress?, status?, media_type? }
 */
export function createScraper({
  source,
  fetchInfo,
  getTitle,
  getSubtitle,
  parseSeasonEpisode,
}) {
  const POLL_MS = 10_000;
  let pollInterval = null;
  let lastTitle = null;
  let lastHref = location.href;
  let dead = false;

  // ── Guard contra "Extension context invalidated" ────────────────────────────
  // Quando a extensão é recarregada, qualquer acesso ao chrome.runtime lança.
  // Marcamos dead=true na primeira ocorrência e paramos tudo.

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

  function sendClear() {
    lastTitle = null;
    send({ type: "ACTIVITY_CLEAR" });
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

  // ── Coleta via API interna (estratégia primária) ───────────────────────────

  async function collectViaApi() {
    if (!fetchInfo) return null;
    try {
      const info = await fetchInfo();
      if (!info?.title) return null;

      // Complementa com progresso do elemento <video> se não vier da API
      if (info.progress == null) {
        const video = document.querySelector("video");
        if (video && video.duration > 0) {
          info.progress = Math.round(
            (video.currentTime / video.duration) * 100,
          );
          info.status = video.paused ? "paused" : "watching";
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

  function collectViaDom() {
    try {
      const video = document.querySelector("video");
      if (!video || video.paused || video.ended || video.readyState < 2)
        return null;

      const title = getTitle?.()?.trim();
      if (!title) return null;

      const progress =
        video.duration > 0
          ? Math.round((video.currentTime / video.duration) * 100)
          : null;

      const { season, episode } = extractSE(getSubtitle?.() ?? null);

      return {
        title,
        season,
        episode,
        progress,
        source,
        status: video.paused ? "paused" : "watching",
        media_type: season != null ? "episode" : "movie",
      };
    } catch {
      return null;
    }
  }

  // ── Ciclo de coleta ────────────────────────────────────────────────────────

  async function collect() {
    const payload = (await collectViaApi()) ?? collectViaDom();
    return payload;
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
          lastTitle = payload.title;
          send({ type: "ACTIVITY_UPDATE", payload });
        } else if (lastTitle) {
          sendClear();
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
    sendClear();
  }

  // ── Aguarda <video> aparecer ───────────────────────────────────────────────
  // Quando fetchInfo está disponível, inicia polling imediatamente (sem precisar
  // de <video> no DOM), pois os dados vêm da API.

  function waitForVideo() {
    if (fetchInfo || document.querySelector("video")) {
      startPolling();
      return;
    }
    const videoObserver = new MutationObserver(() => {
      try {
        if (!isAlive()) {
          videoObserver.disconnect();
          return;
        }
        if (document.querySelector("video")) {
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
}
```

---

## content/netflix.js

```js
/**
 * PixelReel Content Script — Netflix
 *
 * Estratégia primária: API Shakti interna do Netflix.
 * Fallback: DOM scraping.
 *
 * A API Shakti retorna metadados completos do título atual.
 * O buildIdentifier fica em window.netflix.reactContext ou pode ser
 * extraído do HTML da página.
 */

import { createScraper } from "./scraper-base.js";

// Extrai o ID do vídeo da URL: /watch/12345678
function getVideoId() {
  const match = location.pathname.match(/\/watch\/(\d+)/);
  return match?.[1] ?? null;
}

// Extrai o buildIdentifier do contexto React do Netflix
function getBuildId() {
  try {
    return (
      window.netflix?.reactContext?.models?.serverDefs?.data
        ?.BUILD_IDENTIFIER ?? null
    );
  } catch {
    return null;
  }
}

createScraper({
  source: "netflix",

  async fetchInfo() {
    const videoId = getVideoId();
    if (!videoId) return null;

    const buildId = getBuildId();
    if (!buildId) return null;

    const url = `https://www.netflix.com/api/shakti/${buildId}/metadata?movieid=${videoId}&drmSystem=widevine&isWatchlistEnabled=false&isShortformEnabled=false&isVolatileBillboardsEnabled=false`;

    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;

    const data = await res.json();
    const video = data?.video;
    if (!video) return null;

    // Filme
    if (video.type === "movie") {
      return { title: video.title, media_type: "movie" };
    }

    // Série — encontra o episódio atual
    if (video.type === "show") {
      for (const season of video.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
          if (String(ep.id) === String(videoId)) {
            return {
              title: video.title,
              season: season.seq,
              episode: ep.seq,
              media_type: "episode",
            };
          }
        }
      }
      // Episódio não encontrado nos metadados, retorna só o título
      return { title: video.title, media_type: "episode" };
    }

    return null;
  },

  // ── Fallback DOM ──────────────────────────────────────────────────────────

  getTitle() {
    const container = document.querySelector("[data-uia='video-title']");
    if (container) {
      const spans = Array.from(container.querySelectorAll("span"));
      if (spans.length > 0) return spans[0].innerText.trim();
      return container.innerText.trim();
    }
    return (
      document.querySelector(".video-title h4")?.innerText ||
      document.querySelector(".ellipsize-text .title")?.innerText ||
      null
    );
  },

  getSubtitle() {
    const container = document.querySelector("[data-uia='video-title']");
    if (container) {
      const spans = Array.from(container.querySelectorAll("span"));
      if (spans.length > 1)
        return spans
          .slice(1)
          .map((s) => s.innerText)
          .join(" ");
    }
    return (
      document.querySelector(".ellipsize-text .subtitle")?.innerText || null
    );
  },

  parseSeasonEpisode(sub) {
    if (!sub) return { season: null, episode: null };
    let match = sub.match(/[ST](\d+)\s*(?::|·|Ep\.?)\s*E?(\d+)/i);
    if (match)
      return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
      };
    match = sub.match(
      /(?:Season|Temporada)\s+(\d+)[^\d]+(?:Episode|Ep|Episódio)\s+(\d+)/i,
    );
    if (match)
      return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
      };
    match = sub.match(/E(\d+)/i) || sub.match(/(?:Episode|Episódio)\s+(\d+)/i);
    if (match) return { season: 1, episode: parseInt(match[1], 10) };
    return { season: null, episode: null };
  },
});
```

---

## content/hbo.js

```js
/**
 * PixelReel Content Script — Max (HBO Max)
 *
 * Estratégia primária: API CMS interna do Max (mesmo approach do PreMiD).
 * Fallback: DOM scraping.
 */

import { createScraper } from "./scraper-base.js";

// Cache da resposta da API para não repetir o fetch na mesma página
let cachedPath = null;
let cachedData = null;

async function fetchMaxApi() {
  const { pathname } = location;
  if (cachedPath === pathname && cachedData) return cachedData;

  const res = await fetch(
    `https://default.any-amer.prd.api.hbomax.com/cms/routes${pathname}?include=default&page[items.size]=10`,
    { method: "GET", credentials: "include" },
  );
  if (!res.ok) return null;

  const data = await res.json();
  data._path = pathname;
  cachedPath = pathname;
  cachedData = data;
  return data;
}

function findByAlternateId(data, id) {
  return data.included?.find((x) => x.attributes?.alternateId === id);
}

function findById(data, id) {
  return data.included?.find((x) => x.id === id);
}

createScraper({
  source: "max",

  async fetchInfo() {
    // Só processa páginas de vídeo
    if (!location.pathname.includes("/video/")) return null;

    const data = await fetchMaxApi();
    if (!data) return null;

    const segments = location.pathname.split("/");
    const episodeAltId = segments[3];

    const episodeInfo = findByAlternateId(data, episodeAltId);
    if (!episodeInfo) return null;

    const showAltId = episodeInfo.relationships?.show?.data?.id;
    const showInfo = findByAlternateId(data, showAltId ?? "");

    const isMovie = episodeInfo.attributes?.videoType === "MOVIE";

    if (isMovie) {
      return {
        title: episodeInfo.attributes.name,
        media_type: "movie",
      };
    }

    return {
      title: showInfo?.attributes?.name ?? episodeInfo.attributes.name,
      season: episodeInfo.attributes.seasonNumber ?? null,
      episode: episodeInfo.attributes.episodeNumber ?? null,
      media_type: "episode",
    };
  },

  // ── Fallback DOM ──────────────────────────────────────────────────────────

  getTitle() {
    return (
      document.querySelector("[data-testid='player-ux-asset-title']")
        ?.innerText ||
      document.querySelector("[class*='TitlePlayerContainer'] h1")?.innerText ||
      document.querySelector("[class*='PlayerMetadata'] [class*='title']")
        ?.innerText ||
      document.querySelector(".hbo-player__title")?.innerText ||
      null
    );
  },

  getSubtitle() {
    return (
      document.querySelector("[data-testid='player-ux-asset-subtitle']")
        ?.innerText ||
      document.querySelector("[class*='PlayerMetadata'] [class*='subtitle']")
        ?.innerText ||
      document.querySelector(".hbo-player__subtitle")?.innerText ||
      null
    );
  },

  parseSeasonEpisode(sub) {
    if (!sub) return { season: null, episode: null };
    let match = sub.match(/S(\d+)\s*E(\d+)/i);
    if (match)
      return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
      };
    match = sub.match(/Season\s+(\d+)[^\d]+Episode\s+(\d+)/i);
    if (match)
      return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
      };
    match = sub.match(/(?:Ep\.?\s*|Episode\s+)(\d+)/i);
    if (match) return { season: 1, episode: parseInt(match[1], 10) };
    return { season: null, episode: null };
  },
});
```

---

## content/disney.js

```js
/**
 * PixelReel Content Script — Disney+
 *
 * Estratégia primária: API BAMGrid interna do Disney+.
 * Fallback: DOM scraping.
 *
 * O contentId fica na URL: /play/{contentId}
 * A região e audience são fixas para funcionar sem auth extra.
 */

import { createScraper } from "./scraper-base.js";

function getContentId() {
  const match = location.pathname.match(/\/play\/([^/?]+)/);
  return match?.[1] ?? null;
}

createScraper({
  source: "disney",

  async fetchInfo() {
    const contentId = getContentId();
    if (!contentId) return null;

    // Endpoint público da BAMGrid (mesmo usado pelo app Disney+)
    const url = `https://disney.content.edge.bamgrid.com/svc/content/DmcVideoBundle/version/5.1/region/US/audience/k-false,l-true/asset/${contentId}`;

    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;

    const data = await res.json();
    const video = data?.data?.DmcVideoBundle?.video;
    if (!video) return null;

    const texts = video.text?.title?.full;
    const title =
      texts?.series?.default?.content ||
      texts?.program?.default?.content ||
      null;

    if (!title) return null;

    const episodic = video.episodic;
    if (episodic) {
      return {
        title,
        season: episodic.seasonSequenceNumber ?? null,
        episode: episodic.episodeSequenceNumber ?? null,
        media_type: "episode",
      };
    }

    return { title, media_type: "movie" };
  },

  // ── Fallback DOM ──────────────────────────────────────────────────────────

  getTitle() {
    return (
      document.querySelector('[class*="title--"]')?.innerText ||
      document.querySelector("[data-testid='player-title']")?.innerText ||
      document.querySelector(".title__DPText")?.innerText ||
      null
    );
  },

  getSubtitle() {
    return (
      document.querySelector('[class*="subtitle--"]')?.innerText ||
      document.querySelector("[data-testid='player-subtitle']")?.innerText ||
      null
    );
  },

  parseSeasonEpisode(sub) {
    if (!sub) return { season: null, episode: null };
    let match = sub.match(/S(\d+)\s*E(\d+)/i);
    if (match)
      return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
      };
    match = sub.match(/Season\s+(\d+)[^\d]+Episode\s+(\d+)/i);
    if (match)
      return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
      };
    return { season: null, episode: null };
  },
});
```

---

## content/prime.js

```js
/**
 * PixelReel Content Script — Amazon Prime Video
 *
 * Estratégia: DOM scraping.
 * A API do Prime requer tokens de autenticação adicionais complexos,
 * então mantemos DOM como estratégia única por ora.
 *
 * Toda a lógica de polling e ciclo de vida está em scraper-base.js.
 */

import { createScraper } from "./scraper-base.js";

createScraper({
  source: "prime",

  getTitle() {
    return (
      document.querySelector(".atvwebplayersdk-title-text")?.innerText ||
      document.querySelector("[data-automation-id='title']")?.innerText ||
      document.querySelector(".avu-title")?.innerText ||
      null
    );
  },

  getSubtitle() {
    return (
      document.querySelector(".atvwebplayersdk-subtitle-text")?.innerText ||
      document.querySelector("[data-automation-id='subtitle']")?.innerText ||
      null
    );
  },

  parseSeasonEpisode(sub) {
    if (!sub) return { season: null, episode: null };
    let match = sub.match(/Season\s+(\d+)[^\d]+(?:Ep\.?\s*|Episode\s+)(\d+)/i);
    if (match)
      return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
      };
    match = sub.match(/S(\d+)\s*E(\d+)/i);
    if (match)
      return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
      };
    return { season: null, episode: null };
  },
});
```

---

## background/service-worker.js

```js
/**
 * PixelReel Extension — service-worker.js
 *
 * Responsabilidades:
 *  1. Manter alarme periódico para heartbeats.
 *  2. Receber estado dos content scripts via mensagens.
 *  3. Enviar PATCH /api/v1/activity com o token Bearer.
 *  4. Detectar e registrar scrobbles (threshold de progresso).
 */

import { API_BASE } from "../config.js";

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
      if (isFirstDetect) {
        sendHeartbeat(incoming).then(() => sendResponse({ ok: true }));
        return true;
      }
      sendResponse({ ok: true });
      break;
    }
    case "ACTIVITY_CLEAR":
      currentState = null;
      scrobbledTitles.clear();
      sendResponse({ ok: true });
      break;
    case "GET_STATUS":
      sendResponse({ state: currentState });
      break;
    default:
      sendResponse({ ok: false, error: "Mensagem desconhecida" });
  }
});
```

---

## popup/popup.html

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PixelReel</title>
    <link rel="stylesheet" href="popup.css" />
  </head>
  <body>
    <div class="app">
      <header class="header">
        <img src="../icons/icon-48.png" alt="PixelReel" class="logo" />
        <div>
          <h1 class="brand">PixelReel</h1>
          <p class="brand-sub">Activity Tracker</p>
        </div>
      </header>

      <div class="card" id="status-card">
        <div class="status-dot" id="status-dot"></div>
        <div class="status-info">
          <p class="status-label" id="status-label">Verificando…</p>
          <p class="status-title" id="status-title"></p>
          <p class="status-meta" id="status-meta"></p>
        </div>
      </div>

      <div class="row">
        <span class="toggle-label">Tracking ativo</span>
        <label class="toggle" aria-label="Ativar ou pausar tracking">
          <input type="checkbox" id="toggle-tracking" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="section">
        <label class="field-label" for="token-input">API Token</label>
        <div class="field-row">
          <input
            type="password"
            id="token-input"
            class="field-input"
            placeholder="Cole o token gerado no perfil…"
            autocomplete="off"
            spellcheck="false"
          />
          <button
            class="btn-eye"
            id="btn-eye"
            aria-label="Mostrar token"
            title="Mostrar/ocultar token"
          >
            👁
          </button>
        </div>
        <div class="field-row">
          <button class="btn btn-primary" id="btn-save">Salvar</button>
          <button class="btn btn-ghost" id="btn-clear">Limpar</button>
        </div>
        <p class="hint" id="save-hint"></p>
      </div>

      <footer class="footer">
        <!-- href injetado pelo popup.js via config.js -->
        <a id="token-link" href="#" target="_blank" class="link"
          >Gerar token no site ↗</a
        >
      </footer>
    </div>
    <script type="module" src="popup.js"></script>
  </body>
</html>
```

---

## popup/popup.js

```js
/**
 * PixelReel Popup — popup.js
 */

import { SITE_BASE } from "../config.js";

const $ = (id) => document.getElementById(id);

const dot = $("status-dot");
const label = $("status-label");
const titleEl = $("status-title");
const metaEl = $("status-meta");
const toggle = $("toggle-tracking");
const tokenIn = $("token-input");
const btnSave = $("btn-save");
const btnClear = $("btn-clear");
const btnEye = $("btn-eye");
const hint = $("save-hint");
const tokenLink = $("token-link");

if (tokenLink) tokenLink.href = `${SITE_BASE}/settings/tokens`;

chrome.storage.local.get(
  ["token", "trackingEnabled"],
  ({ token, trackingEnabled }) => {
    if (token) tokenIn.value = token;
    toggle.checked = trackingEnabled !== false;
    refreshStatus();
  },
);

function refreshStatus() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
    if (chrome.runtime.lastError || !res?.state) {
      setStatus("inactive", "Sem atividade");
      return;
    }
    const { status, title } = res.state;
    if (status === "watching") setStatus("active", title, buildMeta(res.state));
    else if (status === "paused") setStatus("paused", title, "Pausado");
    else setStatus("inactive", "Sem atividade");
  });
}

function buildMeta(state) {
  const parts = [];
  if (state.season != null) parts.push(`T${state.season} E${state.episode}`);
  if (state.progress != null) parts.push(`${Math.round(state.progress)}%`);
  if (state.source) parts.push(capitalize(state.source));
  return parts.join(" · ");
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

function setStatus(type, title, meta = "") {
  const labels = {
    active: "Assistindo agora",
    paused: "Pausado",
    inactive: "Inativo",
    error: "Erro",
  };
  dot.className = `status-dot ${type}`;
  label.textContent = labels[type] ?? type;
  titleEl.textContent = title ?? "";
  metaEl.textContent = meta;
}

setInterval(refreshStatus, 5_000);

toggle.addEventListener("change", () => {
  chrome.storage.local.set({ trackingEnabled: toggle.checked });
});

btnSave.addEventListener("click", () => {
  const value = tokenIn.value.trim();
  if (!value) {
    showHint("Cole o token antes de salvar.", "error");
    return;
  }
  chrome.storage.local.set({ token: value }, () =>
    showHint("Token salvo com sucesso! ✓", "ok"),
  );
});

btnClear.addEventListener("click", () => {
  chrome.storage.local.remove("token", () => {
    tokenIn.value = "";
    showHint("Token removido.", "");
  });
});

let visible = false;
btnEye.addEventListener("click", () => {
  visible = !visible;
  tokenIn.type = visible ? "text" : "password";
  btnEye.title = visible ? "Ocultar token" : "Mostrar token";
});

let hintTimeout;
function showHint(msg, type) {
  hint.textContent = msg;
  hint.className = `hint ${type}`;
  clearTimeout(hintTimeout);
  if (msg)
    hintTimeout = setTimeout(() => {
      hint.textContent = "";
      hint.className = "hint";
    }, 3000);
}
```

---

## Notas de implementação

### API do Netflix (`fetchInfo`)

O endpoint Shakti pode exigir que o `buildId` esteja disponível no contexto
React da página. Se `window.netflix.reactContext` não existir (ex: página de
browse sem vídeo ativo), `fetchInfo` retorna `null` e o base usa o DOM.

### API do Disney+ (`fetchInfo`)

O endpoint BAMGrid pode retornar 403 dependendo da região. Se isso acontecer,
ajuste a região na URL (`/region/BR/`) ou use o DOM como único fallback.

### Cache do HBO Max

A resposta da API é cacheada por `pathname`. Se o usuário navegar para um
episódio diferente sem recarregar, o `spaObserver` do `scraper-base` detecta
a mudança de URL, reinicia o polling e o cache é invalidado automaticamente
(porque `cachedPath !== pathname`).

### Adicionando nova plataforma

1. Criar `content/novaPlataforma.js`
2. Implementar `createScraper({ source, fetchInfo?, getTitle?, getSubtitle? })`
3. Adicionar entrada em `manifest.json` → `content_scripts`
4. Adicionar domínio em `host_permissions` se usar `fetchInfo`
