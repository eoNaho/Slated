/**
 * PixelReel Content Script — Amazon Prime Video
 *
 * Estratégia: DOM scraping.
 * A API do Prime requer tokens de autenticação adicionais complexos,
 * então mantemos DOM como estratégia única por ora.
 *
 * Toda a lógica de polling e ciclo de vida está em scraper-base.js.
 */




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
