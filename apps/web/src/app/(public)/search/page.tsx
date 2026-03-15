"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  Film,
  Tv,
  AlertCircle,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mediaApi } from "@/lib/api";
import type { SearchResult } from "@/types";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const pageParam = Number(searchParams.get("page")) || 1;

  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(pageParam);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string, p: number = 1) => {
    if (!q.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await mediaApi.search(q, {}, p);

      setResults(data.data || []);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotalResults(data.total);
    } catch (err) {
      setError("Failed to search. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) {
      search(query, pageParam);
    }
  }, [query, pageParam, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    router.push(`/search?q=${encodeURIComponent(query)}&page=${newPage}`);
  };

  const handleClick = async (item: SearchResult) => {
    const type = item.mediaType === "movie" ? "movies" : "series";

    if (item.isLocal && item.localId) {
      router.push(`/${type}/${item.localId}`);
      return;
    }

    setIsNavigating(item.tmdbId);

    try {
      // For now, we fetch preview to ensure data availability
      // In future, this could open a preview modal
      const { data } = await mediaApi.preview(item.tmdbId, item.mediaType);

      // If we implemented public import, we would call it here
      // For now, redirect to preview page or show alert
      // router.push(`/${type}/preview/${item.tmdbId}`); 
      console.log("Preview data loaded:", data);
      alert("Preview mode enabled - details loaded in console");
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to load. Please try again.");
    } finally {
      setIsNavigating(null);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 lg:px-8">
        {/* Search Header */}
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Search</h1>
          <p className="text-zinc-400">
            Find movies and TV series from millions of titles
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies and TV series..."
              className="pl-12 pr-4 py-6 text-lg bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-purple-500"
            />
            <Button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            >
              Search
            </Button>
          </div>
        </form>

        {/* Results Count */}
        {!isLoading && query && totalResults > 0 && (
          <div className="text-center mb-6">
            <p className="text-zinc-400">
              Found{" "}
              <span className="text-white font-medium">
                {totalResults.toLocaleString()}
              </span>{" "}
              results
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 max-w-2xl mx-auto">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-300 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
            <p className="text-zinc-400">Searching...</p>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && results.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((item) => {
                const isMovie = item.mediaType === "movie";
                const isCurrentlyNavigating = isNavigating === item.tmdbId;

                return (
                  <button
                    key={`${item.mediaType}-${item.tmdbId}`}
                    onClick={() => handleClick(item)}
                    disabled={isCurrentlyNavigating}
                    className="group relative text-left"
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-900">
                      {item.posterPath ? (
                        <img
                          src={item.posterPath}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                          {isMovie ? (
                            <Film className="h-12 w-12 text-zinc-700" />
                          ) : (
                            <Tv className="h-12 w-12 text-zinc-700" />
                          )}
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Loading overlay */}
                      {isCurrentlyNavigating && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                        </div>
                      )}

                      {/* Type badge */}
                      <div
                        className={cn(
                          "absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium",
                          isMovie
                            ? "bg-purple-600 text-white"
                            : "bg-pink-600 text-white"
                        )}
                      >
                        {isMovie ? "Movie" : "TV"}
                      </div>

                      {/* Rating */}
                      {item.voteAverage && item.voteAverage > 0 && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-xs text-white">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {item.voteAverage.toFixed(1)}
                        </div>
                      )}
                    </div>

                    <div className="mt-2">
                      <h3 className="line-clamp-1 text-sm font-medium text-white group-hover:text-purple-400 transition-colors">
                        {item.title}
                      </h3>
                      {item.releaseDate && (
                        <p className="text-xs text-zinc-500">
                          {new Date(item.releaseDate).getFullYear()}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={cn(
                          "min-w-[40px]",
                          pageNum === page
                            ? "bg-purple-600 hover:bg-purple-500"
                            : "bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
                        )}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* No results */}
        {!isLoading && query && results.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No results found
            </h2>
            <p className="text-zinc-400">Try a different search term</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !query && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Find your next watch
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              Search for any movie or TV series. Click on a result to view
              details and add it to your library.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
