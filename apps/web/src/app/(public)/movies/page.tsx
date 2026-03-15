import Link from "next/link";
import { Film, TrendingUp, Star, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaCard } from "@/components/media";
import type { Media, PaginatedResponse } from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

async function getPopularMovies(): Promise<PaginatedResponse<Media> | null> {
  try {
    const res = await fetch(`${API_URL}/media/popular?type=movie&limit=20`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const metadata = {
  title: "Movies",
  description: "Discover and explore popular movies",
};

export default async function MoviesPage() {
  const movies = await getPopularMovies();

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-black to-black" />
        <div className="container mx-auto px-4 lg:px-8 py-16 relative">
          <div className="flex items-center gap-3 mb-4">
            <Film className="h-8 w-8 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">Movies</h1>
          </div>
          <p className="text-xl text-zinc-400 max-w-2xl">
            Discover the best movies from around the world. Track what
            you&apos;ve watched, rate your favorites, and build your personal
            film diary.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 lg:px-8 py-8 border-b border-white/10">
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" className="text-purple-400 bg-purple-400/10">
            <TrendingUp className="h-4 w-4 mr-2" />
            Popular
          </Button>
          <Button variant="ghost" className="text-zinc-400 hover:text-white">
            <Star className="h-4 w-4 mr-2" />
            Top Rated
          </Button>
          <Button variant="ghost" className="text-zinc-400 hover:text-white">
            <Calendar className="h-4 w-4 mr-2" />
            Upcoming
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {movies && movies.data.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {movies.data.map((movie) => (
                <MediaCard key={movie.id} media={movie} />
              ))}
            </div>

            {/* Pagination */}
            {movies.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                {Array.from(
                  { length: Math.min(movies.totalPages, 10) },
                  (_, i) => (
                    <Link key={i + 1} href={`/movies?page=${i + 1}`}>
                      <Button
                        variant={movies.page === i + 1 ? "default" : "outline"}
                        size="sm"
                        className={
                          movies.page === i + 1
                            ? "bg-purple-600 hover:bg-purple-700"
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
            <Film className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No movies yet
            </h2>
            <p className="text-zinc-400">
              Search for movies to add them to the library.
            </p>
            <Link href="/search">
              <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                Search Movies
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
