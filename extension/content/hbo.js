/**
 * PixelReel Content Script — Max (HBO Max)
 *
 * Estratégia primária: API CMS interna do Max (mesmo approach do PreMiD).
 * Fallback: DOM scraping.
 */




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
