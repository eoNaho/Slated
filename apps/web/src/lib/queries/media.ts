import { mediaApi } from "@/lib/api";
import type { MediaDetails, Review, List, SearchResult, PaginatedResponse, Media } from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export async function getMovie(slug: string): Promise<MediaDetails | null> {
  try {
    const res = await mediaApi.getBySlug(slug);
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function getPopularMovies(): Promise<PaginatedResponse<Media> | null> {
  try {
    const res = await fetch(`${API_URL}/media/popular?type=movie`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getPopularReviews(mediaId: string): Promise<Review[]> {
  try {
    const res = await mediaApi.getReviews(mediaId, "popular", 1);
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function getSimilarFilms(tmdbId: number): Promise<SearchResult[]> {
  try {
    const res = await mediaApi.getSimilar(tmdbId, "movie", 1);
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function getSimilarSeries(tmdbId: number): Promise<SearchResult[]> {
  try {
    const res = await mediaApi.getSimilar(tmdbId, "series", 1);
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function getPopularLists(mediaId: string): Promise<List[]> {
  try {
    const res = await mediaApi.getLists(mediaId, 1, 4);
    return res.data ?? [];
  } catch {
    return [];
  }
}
