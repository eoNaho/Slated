import { cookies } from "next/headers";
import type { Metadata } from "next";
import Image from "next/image";
import { Star } from "lucide-react";
import {
  HeroSection,
  WatchlistRow,
  FriendsActivity,
  CTABanner,
  DashboardGreeting,
} from "@/components/home";
import { Carousel, SectionHeader } from "@/components/common";
import { MediaCard, ReviewCard } from "@/components/media";
import {
  getTrending,
  transformTrendingToMedia,
  generateReviews,
  getRecommendations,
} from "@/lib/queries/home";
import { StoriesBar } from "@/components/stories/StoriesBar";

const AUTH_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "http://localhost:3001";

async function getSession(cookieHeader: string) {
  try {
    const res = await fetch(`${AUTH_BASE}/api/auth/get-session`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: "PixelReel — Track Movies & Series",
  description:
    "Discover, track, and review movies and TV series. Build watchlists, follow friends, and share your cinematic journey on PixelReel.",
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const session = await getSession(cookieHeader);
  const isLoggedIn = !!session?.user;

  const recommendationsReq = isLoggedIn
    ? getRecommendations(cookieHeader)
    : Promise.resolve({ data: [] });

  const [trendingAll, trendingMovies, trendingTV, recommendedRes] =
    await Promise.all([
      getTrending("all"),
      getTrending("movie"),
      getTrending("series"),
      recommendationsReq,
    ]);

  const heroMedia = transformTrendingToMedia(trendingAll.slice(0, 5));
  const trendingMedia = transformTrendingToMedia(trendingAll);
  const newArrivals = transformTrendingToMedia([
    ...trendingTV.slice(0, 10),
    ...trendingMovies.slice(0, 10),
  ]);
  const reviews = generateReviews(trendingAll.slice(5, 9));
  const trendingSidebar = transformTrendingToMedia(trendingMovies.slice(0, 8));
  const hasRecommendations =
    recommendedRes.data && recommendedRes.data.length > 0;

  return (
    <div className="relative min-h-screen">
      {/* Stories Feed */}
      <StoriesBar />

      {/* Personalized Dashboard */}
      {isLoggedIn && (
        <div className="container mx-auto">
          <DashboardGreeting
            user={session.user}
            featuredRecommendation={
              hasRecommendations ? recommendedRes.data[0] : null
            }
          />
        </div>
      )}

      {/* Hero Section — Editorial Layout */}
      <HeroSection initialMedia={heroMedia} />

      {/* Recommendations Carousel */}
      {isLoggedIn && hasRecommendations && (
        <div className="container mx-auto">
          <Carousel title="Recommended for You" href="#">
            {recommendedRes.data.map((media) => (
              <div key={media.id} className="snap-start flex-shrink-0">
                <MediaCard media={media} />
              </div>
            ))}
          </Carousel>
        </div>
      )}

      {/* [Logged-in] Watchlist — what to watch next */}
      <WatchlistRow />

      {/* Trending Now Carousel */}
      <Carousel title="Trending Now" href="/search">
        {trendingMedia.map((media) => (
          <div key={media.id} className="snap-start flex-shrink-0">
            <MediaCard media={media} />
          </div>
        ))}
      </Carousel>

      {/* [Logged-in] Friends Activity */}
      <FriendsActivity />

      {/* Two-Column Section: Reviews + Trending Sidebar */}
      <section className="bg-zinc-900/20 py-16 border-y border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-purple-600/5 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 xl:gap-16">
            {/* Popular Reviews — 2/3 */}
            <div className="lg:col-span-2">
              <SectionHeader
                title="Popular Reviews"
                subtitle="Join the conversation"
                href="/reviews"
              />
              <div className="flex flex-col gap-4">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </div>

            {/* Trending This Week Sidebar — 1/3 */}
            <div>
              <SectionHeader title="Trending This Week" href="/search" />
              <div className="flex flex-col divide-y divide-white/5">
                {trendingSidebar.map((media, i) => (
                  <div
                    key={media.id}
                    className="flex items-center gap-4 py-3 group"
                  >
                    <span className="text-zinc-700 text-sm font-mono w-5 text-right flex-shrink-0">
                      {i + 1}
                    </span>
                    {media.posterPath ? (
                      <Image
                        src={media.posterPath}
                        alt={media.title}
                        width={36}
                        height={54}
                        className="rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-14 rounded bg-zinc-800 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors truncate">
                        {media.title}
                      </p>
                      {media.voteAverage && media.voteAverage > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-zinc-500">
                            {media.voteAverage.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

      {/* CTA Banner — only for non-authenticated users */}
      <CTABanner />
    </div>
  );
}
