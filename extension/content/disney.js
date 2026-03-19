/**
 * PixelReel Content Script — Disney+
 *
 * Estratégia primária: API BAMGrid interna do Disney+.
 * Fallback: DOM scraping.
 *
 * O contentId fica na URL: /play/{contentId}
 * A região e audience são fixas para funcionar sem auth extra.
 */




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
