/**
 * PixelReel Content Script — Disney+
 *
 * Estratégia:
 *  1. API BAMGrid (DmcVideo, depois DmcVideoBundle como legado)
 *  2. navigator.mediaSession
 *  3. document.title  ← novo: "Uma Mente Excepcional | Disney+"
 *  4. DOM scraping
 *
 * Análise do HTML real confirmou:
 *  - URL format: /pt-br/play/{uuid}  (locale prefix antes de /play/)
 *  - Região extraída da URL  (/pt-br/ → "BR")
 *  - window.server_path.content acessível para base URL da API
 *  - document.title sempre preenchido com nome do conteúdo
 */

/**
 * Extrai o UUID do contentId da URL.
 * Suporta: /play/{uuid}  e  /pt-br/play/{uuid}
 */
function getContentId() {
  const match = location.pathname.match(/\/play\/([^/?#]+)/);
  return match?.[1] ?? null;
}

/**
 * Extrai a região de 2 letras a partir do locale da URL.
 * /pt-br/play/… → "BR"
 * /es-419/play/… → "US"  (fallback para regiões sem código ISO direto)
 * /play/… → "US"  (sem locale = mercado US)
 *
 * O edge da BAMGrid aceita "US" para qualquer mercado autenticado,
 * mas usar a região correta melhora a acurácia dos metadados.
 */
function getRegionFromUrl() {
  const localeMatch = location.pathname.match(/^\/([a-z]{2}-([a-z]{2}))\//i);
  if (localeMatch) {
    const country = localeMatch[2].toUpperCase(); // "pt-br" → "BR"
    return country;
  }
  // Também tenta window.preferredLanguage  (ex: "pt-BR")
  try {
    const lang = window.preferredLanguage; // injetado pelo Disney+ no HTML
    if (lang) {
      const parts = lang.split("-");
      if (parts.length === 2) return parts[1].toUpperCase();
    }
  } catch {}
  return "US";
}

/**
 * Extrai o base URL da API a partir da config injetada pelo Disney+.
 * Fallback: edge público padrão.
 */
function getContentBase() {
  try {
    return (
      window.server_path?.content ?? "https://disney.content.edge.bamgrid.com"
    );
  } catch {
    return "https://disney.content.edge.bamgrid.com";
  }
}

/**
 * Extrai título a partir de uma resposta de vídeo da BAMGrid.
 */
function parseVideoResponse(video) {
  if (!video) return null;
  const texts = video.text?.title?.full;
  const title =
    texts?.series?.default?.content || texts?.program?.default?.content || null;
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
}

/**
 * Fallback via navigator.mediaSession.
 * Disney+ popula title/artist/album quando o player está ativo.
 */
function collectViaMediaSession() {
  const ms = navigator.mediaSession?.metadata;
  if (!ms?.title) return null;

  const title = ms.title.trim();
  const artist = ms.artist?.trim() || null;
  const album = ms.album?.trim() || null;
  if (!title) return null;

  const isEpisode = !!artist;
  let season = null;
  let episode = null;

  const seSource = `${album ?? ""} ${artist ?? ""} ${title}`;
  const seMatch =
    seSource.match(/S(\d+)\s*[·\-]?\s*E(\d+)/i) ||
    seSource.match(/Season\s+(\d+)[^\d]+Episode\s+(\d+)/i);
  if (seMatch) {
    season = parseInt(seMatch[1], 10);
    episode = parseInt(seMatch[2], 10);
  } else if (isEpisode && album) {
    const sMatch =
      album.match(/Season\s+(\d+)/i) || album.match(/Temporada\s+(\d+)/i);
    if (sMatch) season = parseInt(sMatch[1], 10);
  }

  return {
    title: isEpisode ? artist || title : title,
    season,
    episode,
    media_type: isEpisode ? "episode" : "movie",
  };
}

/**
 * Fallback via document.title.
 * Disney+ sempre preenche: "Nome do Conteúdo | Disney+"
 * Confiável como última saída antes do DOM.
 */
function collectViaPageTitle() {
  const raw = document.title || "";
  // Remove sufixo " | Disney+" ou " - Disney+"
  const title = raw.replace(/\s*[|–\-]\s*Disney\+.*$/i, "").trim();
  if (!title || title.toLowerCase() === "disney+") return null;
  // document.title não tem info de temporada/episódio, mas já é melhor que nada
  return { title, media_type: "movie" };
}

createScraper({
  source: "disney",

  async fetchInfo() {
    const contentId = getContentId();
    const base = getContentBase();
    const region = getRegionFromUrl();

    if (contentId) {
      // ── Tentativa 1: DmcVideo (endpoint atual 2024+) ─────────────────────
      try {
        const url = `${base}/svc/content/DmcVideo/version/5.1/region/${region}/audience/k-false,l-true/encodedFamilyId/${contentId}`;
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const result = parseVideoResponse(data?.data?.DmcVideo?.video);
          if (result) return result;
        }
      } catch {}

      // ── Tentativa 2: DmcVideoBundle (legado, ainda ativo em alguns mercados) ─
      try {
        const url = `${base}/svc/content/DmcVideoBundle/version/5.1/region/${region}/audience/k-false,l-true/asset/${contentId}`;
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const result = parseVideoResponse(data?.data?.DmcVideoBundle?.video);
          if (result) return result;
        }
      } catch {}
    }

    // ── Tentativa 3: mediaSession ────────────────────────────────────────────
    const fromMs = collectViaMediaSession();
    if (fromMs) return fromMs;

    // ── Tentativa 4: document.title ─────────────────────────────────────────
    return collectViaPageTitle();
  },

  // ── Fallback DOM ──────────────────────────────────────────────────────────
  // Confirmado no HTML real: o player usa custom elements <title-bug> e
  // <title-overlay> que são preenchidos dinamicamente. Os seletores abaixo
  // cobrem o player atual e o legado.

  getTitle() {
    // <title-bug> e <title-overlay> usam shadow DOM no Disney+.
    // Estratégia: tentar shadowRoot, depois light DOM, depois document.title.
    function shadowText(selector) {
      const el = document.querySelector(selector);
      if (!el) return null;
      // Tenta shadow DOM primeiro
      const shadow = el.shadowRoot;
      if (shadow) return shadow.textContent?.trim() || null;
      // Se não tiver shadow, tenta innerText direto
      return el.innerText?.trim() || el.textContent?.trim() || null;
    }

    // A screenshot mostra título no canto superior esquerdo — fica em title-bug
    // O formato dentro do shadow é geralmente dois <p> ou <span>: título e subtítulo
    const titleBugText = shadowText("title-bug");
    if (titleBugText) {
      // Pega apenas a primeira linha (o título da série/filme)
      return titleBugText.split("\n")[0].trim() || null;
    }

    return (
      shadowText("title-overlay") ||
      document
        .querySelector("[data-testid='player-title']")
        ?.innerText?.trim() ||
      document.querySelector('[class*="PlayerTitle"]')?.innerText?.trim() ||
      collectViaPageTitle()?.title ||
      null
    );
  },

  getSubtitle() {
    // A screenshot mostra "T2:E7 Aquele que Escapou" como segunda linha em title-bug
    const el = document.querySelector("title-bug");
    if (el) {
      const shadow = el.shadowRoot;
      const text = shadow
        ? shadow.textContent?.trim()
        : el.innerText?.trim() || el.textContent?.trim();
      if (text) {
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length >= 2) return lines[1]; // segunda linha = "T2:E7 Aquele que Escapou"
      }
    }
    return (
      document.querySelector("[data-testid='player-subtitle']")?.innerText ||
      document.querySelector('[class*="PlayerSubtitle"]')?.innerText ||
      null
    );
  },

  parseSeasonEpisode(sub) {
    if (!sub) return { season: null, episode: null };
    const match =
      // Formato PT-BR do Disney+: "T2:E7" ou "T2:E7 Título"
      sub.match(/T(\d+)[:\s]*E(\d+)/i) ||
      // Formato padrão internacional: "S2E7" ou "S2 E7"
      sub.match(/S(\d+)\s*[·\-]?\s*E(\d+)/i) ||
      sub.match(/Season\s+(\d+)[^\d]+Episode\s+(\d+)/i) ||
      sub.match(/Temporada\s+(\d+)[^\d]+Epis[oó]dio\s+(\d+)/i);
    if (match)
      return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
      };
    return { season: null, episode: null };
  },
});
