import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { HeroSection } from "@/components/home";
import { Carousel, SectionHeader } from "@/components/common";
import { MediaCard, ReviewCard } from "@/components/media";
import { getTrending, transformTrendingToMedia, generateReviews } from "@/lib/queries/home";
import { StoriesBar } from "@/components/stories/StoriesBar";

export const metadata: Metadata = {
  title: "PixelReel — Track Movies & Series",
  description:
    "Discover, track, and review movies and TV series. Build watchlists, follow friends, and share your cinematic journey on PixelReel.",
};

export default async function HomePage() {
  const [trendingAll, trendingMovies, trendingTV] = await Promise.all([
    getTrending("all"),
    getTrending("movie"),
    getTrending("series"),
  ]);

  const heroMedia = transformTrendingToMedia(trendingAll.slice(0, 5));
  const trendingMedia = transformTrendingToMedia(trendingAll);
  const newArrivals = transformTrendingToMedia([
    ...trendingTV.slice(0, 10),
    ...trendingMovies.slice(0, 10),
  ]);
  const reviews = generateReviews(trendingAll.slice(5, 9));
  const trendingSidebar = transformTrendingToMedia(trendingMovies.slice(0, 8));

  return (
    <div className="relative min-h-screen">
      {/* Stories Feed */}
      <StoriesBar />

      {/* Hero Section — Editorial Layout */}
      <HeroSection initialMedia={heroMedia} />

      {/* Trending Now Carousel */}
      <Carousel title="Trending Now" href="/search">
        {trendingMedia.map((media) => (
          <div key={media.id} className="snap-start flex-shrink-0">
            <MediaCard media={media} />
          </div>
        ))}
      </Carousel>

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
                  <div key={media.id} className="flex items-center gap-4 py-3 group">
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
