import type { SearchResult, Media } from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface TrendingResponse {
  data: SearchResult[];
  page: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Shape expected by the ReviewCard component in @/components/media
export interface HomeReview {
  id: number;
  user: { name: string; avatar: string };
  movieTitle: string;
  rating: number;
  content: string;
  likes: number;
  comments: number;
  poster: string;
}

export async function getTrending(
  type: "all" | "movie" | "series" = "all",
): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${API_URL}/media/trending?timeWindow=week&type=${type}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data: TrendingResponse = await res.json();
    return data.data?.slice(0, 20) || [];
  } catch {
    return [];
  }
}

export function transformTrendingToMedia(items: SearchResult[]): Media[] {
  return items.map((t) => ({
    id: String(t.tmdbId),
    tmdbId: t.tmdbId,
    type: t.mediaType,
    title: t.title,
    posterPath: t.posterPath,
    backdropPath: t.backdropPath,
    releaseDate: t.releaseDate,
    voteAverage: t.voteAverage,
    overview: t.overview,
  }));
}

const reviewTemplates = [
  {
    user: { name: "Sofia Coppola Fan", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d" },
    content: "A hauntingly beautiful experience. The direction is simply impeccable.",
    rating: 4,
    likes: 245,
    comments: 32,
  },
  {
    user: { name: "Cinephile Joe", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d" },
    content: "Harrowing. The sound design alone deserves every award available. I'm still shaking.",
    rating: 5,
    likes: 890,
    comments: 120,
  },
  {
    user: { name: "Film_Nerd92", avatar: "https://i.pravatar.cc/150?u=a042581f4e2902612d" },
    content: "A cold, calculating masterpiece that keeps you at arm's length yet completely engaged.",
    rating: 4,
    likes: 467,
    comments: 58,
  },
  {
    user: { name: "MovieMaven", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704e" },
    content: "More existential than I expected. The performances steal the show.",
    rating: 4,
    likes: 1234,
    comments: 234,
  },
];

export function generateReviews(trendingItems: SearchResult[]): HomeReview[] {
  return trendingItems.slice(0, 4).map((item, idx) => ({
    id: idx + 1,
    movieTitle: item.title,
    poster:
      item.posterPath ||
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop",
    ...reviewTemplates[idx],
  }));
}
