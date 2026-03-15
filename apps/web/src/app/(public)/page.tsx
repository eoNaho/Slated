import Link from "next/link";
import { HeroSlider } from "@/components/home";
import { Carousel, SectionHeader } from "@/components/common";
import { MediaCard, ReviewCard, type Review } from "@/components/media";
import type { Media } from "@/types";
import Image from "next/image";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

// Types for trending response
interface TrendingItem {
  id: number;
  tmdbId: number;
  mediaType: "movie" | "series";
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string;
  voteAverage?: number;
  overview?: string;
}

interface TrendingResponse {
  results: TrendingItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

// Fetch trending from TMDB
async function getTrending(
  type: "all" | "movie" | "tv" = "all",
): Promise<TrendingItem[]> {
  try {
    const res = await fetch(`${API_URL}/media/trending/week?type=${type}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data: TrendingResponse = await res.json();
    return data.results?.slice(0, 20) || [];
  } catch {
    return [];
  }
}

// Generate reviews using real movie data
function generateReviews(trendingItems: TrendingItem[]): Review[] {
  const reviewTemplates = [
    {
      user: {
        name: "Sofia Coppola Fan",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
      },
      content:
        "A hauntingly beautiful experience. The direction is simply impeccable.",
      rating: 4,
      likes: 245,
      comments: 32,
    },
    {
      user: {
        name: "Cinephile Joe",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
      },
      content:
        "Harrowing. The sound design alone deserves every award available. I'm still shaking.",
      rating: 5,
      likes: 890,
      comments: 120,
    },
    {
      user: {
        name: "Film_Nerd92",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e2902612d",
      },
      content:
        "A cold, calculating masterpiece that keeps you at arm's length yet completely engaged.",
      rating: 4,
      likes: 467,
      comments: 58,
    },
    {
      user: {
        name: "MovieMaven",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704e",
      },
      content:
        "More existential than I expected. The performances steal the show.",
      rating: 4,
      likes: 1234,
      comments: 234,
    },
  ];

  return trendingItems.slice(0, 4).map((item, idx) => ({
    id: idx + 1,
    movieTitle: item.title,
    poster:
      item.posterPath ||
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop",
    ...reviewTemplates[idx],
  }));
}

function transformTrendingToMedia(items: TrendingItem[]): Media[] {
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

export default async function HomePage() {
  const [trendingAll, trendingMovies, trendingTV] = await Promise.all([
    getTrending("all"),
    getTrending("movie"),
    getTrending("tv"),
  ]);

  const heroMedia = transformTrendingToMedia(trendingAll.slice(0, 5));
  const trendingMedia = transformTrendingToMedia(trendingAll);
  const newArrivals = transformTrendingToMedia([
    ...trendingTV.slice(0, 10),
    ...trendingMovies.slice(0, 10),
  ]);
  const reviews = generateReviews(trendingAll.slice(5, 9));

  return (
    <div className="relative min-h-screen">
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/20 to-black -z-10" />

      {/* Hero Slider */}
      <HeroSlider media={heroMedia} />

      {/* Trending Now Carousel */}
      <Carousel title="Trending Now" href="/search">
        {trendingMedia.map((media) => (
          <div key={media.id} className="snap-start flex-shrink-0">
            <MediaCard media={media} />
          </div>
        ))}
      </Carousel>

      {/* Popular Reviews Section */}
      <section className="bg-zinc-900/30 py-16 border-y border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-purple-600/5 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2" />

        <div className="container mx-auto px-6 relative z-10">
          <SectionHeader
            title="Popular Reviews"
            subtitle="Join the conversation"
            href="/reviews"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals Carousel */}
      <Carousel title="New Arrivals" href="/search?sort=newest">
        {newArrivals.map((media) => (
          <div key={media.id} className="snap-start flex-shrink-0">
            <MediaCard media={media} />
          </div>
        ))}
      </Carousel>

      {/* CTA Banner */}
      <section className="container mx-auto px-6 mb-20 mt-12">
        <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/10">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop"
              className="w-full h-full object-cover opacity-20 mix-blend-overlay"
              loading="lazy"
              alt=""
              width={2070}
              height={1380}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-900/80 to-transparent" />
          </div>

          <div className="relative z-10 px-8 py-20 md:px-16 md:flex items-center justify-between gap-12">
            <div className="max-w-xl space-y-6">
              <h2 className="text-4xl font-black text-white leading-tight">
                Your movie diary, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                  reimagined.
                </span>
              </h2>
              <p className="text-zinc-400 text-lg">
                Track what you watch, save what you want to see, and tell your
                friends what&apos;s good.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-zinc-800 overflow-hidden"
                    >
                      <Image
                        src={`https://i.pravatar.cc/100?img=${i + 10}`}
                        className="w-full h-full object-cover"
                        alt=""
                        width={100}
                        height={100}
                      />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                    +2k
                  </div>
                </div>
                <div className="flex items-center text-sm text-zinc-400">
                  Joined this week
                </div>
              </div>
            </div>

            <div className="mt-8 md:mt-0 flex-shrink-0">
              <Link
                href="/register"
                className="inline-flex items-center justify-center bg-white text-black hover:bg-zinc-200 font-bold px-8 py-4 rounded-full text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-colors"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
