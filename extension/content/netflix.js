/**
 * PixelReel Content Script — Netflix
 *
 * Estratégia primária: Netflix Member API (mesma usada pelo PreMiD).
 * Fallback: DOM scraping.
 *
 * Endpoint correto: /nq/website/memberapi/release/metadata?movieid=<id>
 * Não requer buildIdentifier — funciona com cookies de sessão.
 */

// Extrai o ID do vídeo da URL: /watch/12345678
function getVideoId() {
  const match = location.pathname.match(/\/watch\/(\d+)/);
  return match?.[1] ?? null;
}

// Cache para não re-fetchar a cada poll (evita rate limit)
let _metaCache = null; // { url, data }

async function fetchNetflixMetadata(videoId) {
  const currentUrl = location.href;

  // Retorna cache se ainda estamos na mesma URL
  if (_metaCache?.url === currentUrl && _metaCache?.data) {
    return _metaCache.data;
  }

  try {
    const res = await fetch(
      `https://www.netflix.com/nq/website/memberapi/release/metadata?movieid=${videoId}`,
      { credentials: "include" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    _metaCache = { url: currentUrl, data };
    return data;
  } catch {
    return null;
  }
}

window.createScraper({
  source: "netflix",

  async fetchInfo() {
    const videoId = getVideoId();
    if (!videoId) return null;

    const meta = await fetchNetflixMetadata(videoId);
    const video = meta?.video;
    if (!video) return null;

    // ── Filme ────────────────────────────────────────────────────────────────
    if (video.type === "movie") {
      return {
        title: video.title,
        media_type: "movie",
        // runtime está em segundos no memberapi
        runtime_minutes: video.runtime ? Math.round(video.runtime / 60) : null,
      };
    }

    // ── Série ─────────────────────────────────────────────────────────────────
    if (video.type === "show") {
      // O campo currentEpisode aponta diretamente para o episódio em reprodução
      const currentEpisodeId = video.currentEpisode;

      for (const season of video.seasons ?? []) {
        const episode = season.episodes?.find(
          (ep) => ep.episodeId === currentEpisodeId || ep.id === currentEpisodeId
        );
        if (episode) {
          return {
            title: video.title,
            season: season.seq,
            episode: episode.seq,
            media_type: "episode",
            runtime_minutes: episode.runtime
              ? Math.round(episode.runtime / 60)
              : null,
          };
        }
      }

      // currentEpisode não encontrou no loop — pode ser season-level ID
      // Tenta pelo episódio cujo ID bate com o videoId da URL
      for (const season of video.seasons ?? []) {
        const episode = season.episodes?.find(
          (ep) =>
            String(ep.episodeId) === String(videoId) ||
            String(ep.id) === String(videoId)
        );
        if (episode) {
          return {
            title: video.title,
            season: season.seq,
            episode: episode.seq,
            media_type: "episode",
          };
        }
      }

      // Fallback: título da série sem S/E
      return { title: video.title, media_type: "episode" };
    }

    return null;
  },

  // ── Fallback DOM ─────────────────────────────────────────────────────────

  getTitle() {
    // Netflix renderiza o título dentro de [data-uia="video-title"]
    // Para séries: o primeiro <h4> ou primeiro span com texto longo é o nome da série
    // Para filmes: é o único texto do container

    const container = document.querySelector("[data-uia='video-title']");
    if (!container) {
      return (
        document.querySelector(".video-title h4")?.textContent?.trim() ||
        document.querySelector(".ellipsize-text h4")?.textContent?.trim() ||
        null
      );
    }

    // Para filmes: innerText direto do container (sem spans extras)
    // Para séries: o container tem múltiplos spans — [0]=título, [1]=episódio
    const spans = Array.from(container.querySelectorAll("span"));

    if (spans.length >= 2) {
      // Estrutura série: span[0] = "Nome da Série", span[1] = "E1 · Título do Ep"
      return spans[0].textContent?.trim() || null;
    }

    if (spans.length === 1) {
      // Pode ser filme (um único span) ou série com DOM incompleto
      const text = spans[0].textContent?.trim();
      // Se o texto é só um número de episódio como "E1", pega o h4/h3 pai
      if (text && /^E\d+$/.test(text)) {
        return (
          container.querySelector("h4")?.textContent?.trim() ||
          document.title.split(" - ")[0]?.trim() ||
          null
        );
      }
      return text || null;
    }

    // Sem spans: usa texto direto
    return container.textContent?.trim() || null;
  },

  getSubtitle() {
    const container = document.querySelector("[data-uia='video-title']");
    if (!container) {
      return (
        document.querySelector(".ellipsize-text .subtitle")?.textContent?.trim() ||
        null
      );
    }

    const spans = Array.from(container.querySelectorAll("span"));
    if (spans.length >= 2) {
      // span[1] e além = "T1:E2 · Título do episódio" ou "E2 · Título"
      return spans
        .slice(1)
        .map((s) => s.textContent?.trim())
        .filter(Boolean)
        .join(" ");
    }

    return null;
  },

  parseSeasonEpisode(sub) {
    if (!sub) return { season: null, episode: null };

    // "T2:E3" ou "S2:E3" ou "S2 E3"
    let match = sub.match(/[TS](\d+)\s*[:\-·]?\s*E(\d+)/i);
    if (match) {
      return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
      };
    }

    // "Season 2 Episode 3" / "Temporada 2 Episódio 3"
    match = sub.match(
      /(?:Season|Temporada)\s+(\d+)[^\d]+(?:Episode|Ep|Episódio)\s+(\d+)/i
    );
    if (match) {
      return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
      };
    }

    // Só "E3" — assume temporada 1
    match = sub.match(/\bE(\d+)\b/i) || sub.match(/(?:Episode|Episódio)\s+(\d+)/i);
    if (match) return { season: 1, episode: parseInt(match[1], 10) };

    return { season: null, episode: null };
  },
});