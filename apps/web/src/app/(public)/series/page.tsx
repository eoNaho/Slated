import Link from "next/link";
import { Tv, TrendingUp, Star, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaCard } from "@/components/media";
import type { Media, PaginatedResponse } from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

async function getPopularSeries(): Promise<PaginatedResponse<Media> | null> {
  try {
    const res = await fetch(`${API_URL}/media/popular?type=series&limit=20`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const metadata = {
  title: "TV Series",
  description: "Discover and explore popular TV series",
};

export default async function SeriesPage() {
  const series = await getPopularSeries();

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-900/20 via-black to-black" />
        <div className="container mx-auto px-4 lg:px-8 py-16 relative">
          <div className="flex items-center gap-3 mb-4">
            <Tv className="h-8 w-8 text-pink-400" />
            <h1 className="text-4xl font-bold text-white">TV Series</h1>
          </div>
          <p className="text-xl text-zinc-400 max-w-2xl">
            Explore the best TV series from streaming platforms worldwide. Track
            your progress, rate episodes, and discover your next binge-worthy
            show.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 lg:px-8 py-8 border-b border-white/10">
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" className="text-pink-400 bg-pink-400/10">
            <TrendingUp className="h-4 w-4 mr-2" />
            Popular
          </Button>
          <Button variant="ghost" className="text-zinc-400 hover:text-white">
            <Star className="h-4 w-4 mr-2" />
            Top Rated
          </Button>
          <Button variant="ghost" className="text-zinc-400 hover:text-white">
            <Calendar className="h-4 w-4 mr-2" />
            Airing Now
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {series && series.data.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {series.data.map((show) => (
                <MediaCard key={show.id} media={show} />
              ))}
            </div>

            {/* Pagination */}
            {series.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                {Array.from(
                  { length: Math.min(series.totalPages, 10) },
                  (_, i) => (
                    <Link key={i + 1} href={`/series?page=${i + 1}`}>
                      <Button
                        variant={series.page === i + 1 ? "default" : "outline"}
                        size="sm"
                        className={
                          series.page === i + 1
                            ? "bg-pink-600 hover:bg-pink-700"
                            : "border-white/20 text-white hover:bg-white/10"
                        }
                      >
                        {i + 1}
                      </Button>
                    </Link>
                  )
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Tv className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No series yet
            </h2>
            <p className="text-zinc-400">
              Search for TV series to add them to the library.
            </p>
            <Link href="/search">
              <Button className="mt-4 bg-pink-600 hover:bg-pink-700">
                Search Series
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
