export function resolveImage(
  path: string | null | undefined,
  tmdbSize: string = "w500",
): string | null {
  if (!path) return null;
  if (path.startsWith("http")) {
    const tmdbMatch = path.match(/^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+(\/.+)$/);
    if (tmdbMatch) {
      return `https://image.tmdb.org/t/p/${tmdbSize}${tmdbMatch[1]}`;
    }
    return path;
  }
  if (path.startsWith("tmdb:")) {
    const tmdbPath = path.slice(5);
    return `https://image.tmdb.org/t/p/${tmdbSize}${tmdbPath}`;
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  const base = API_URL.replace(/\/$/, "");
  return `${base}/images/${path}`;
}
