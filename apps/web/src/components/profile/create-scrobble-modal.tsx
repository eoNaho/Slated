"use client";

import * as React from "react";
import { X, History, Film, Tv, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activityApi, searchApi } from "@/lib/api";

interface TmdbSearchResult {
  tmdbId: number;
  mediaType: "movie" | "series";
  title: string;
  posterPath?: string | null;
  releaseDate?: string;
}

interface CreateScrobbleModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateScrobbleModal({ onClose, onSuccess }: CreateScrobbleModalProps) {
  const [query, setQuery] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [tmdbId, setTmdbId] = React.useState<number | undefined>();
  const [mediaType, setMediaType] = React.useState<"movie" | "episode">("movie");
  const [season, setSeason] = React.useState("");
  const [episode, setEpisode] = React.useState("");
  const [source, setSource] = React.useState("");
  const [watchedAt, setWatchedAt] = React.useState(
    new Date().toISOString().slice(0, 16)
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Search state
  const [searchResults, setSearchResults] = React.useState<TmdbSearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [selectedResult, setSelectedResult] = React.useState<TmdbSearchResult | null>(null);
  const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Debounced search
  React.useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await searchApi.search(query.trim(), { type: "all", limit: 8 });
        const results: TmdbSearchResult[] = res.media.map((item) => ({
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          title: item.title,
          posterPath: item.posterPath,
          releaseDate: item.releaseDate,
        }));
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query]);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = (result: TmdbSearchResult) => {
    setSelectedResult(result);
    setTitle(result.title);
    setTmdbId(result.tmdbId);
    setMediaType(result.mediaType === "series" ? "episode" : "movie");
    setQuery(result.title);
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedResult(null);
    setTitle("");
    setTmdbId(undefined);
    setQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || query.trim();
    if (!finalTitle) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await activityApi.createScrobble({
        title: finalTitle,
        media_type: mediaType,
        tmdb_id: tmdbId,
        season: season ? Number(season) : undefined,
        episode: episode ? Number(episode) : undefined,
        source: source.trim() || undefined,
        watched_at: watchedAt ? new Date(watchedAt).toISOString() : undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to log scrobble");
    } finally {
      setIsSubmitting(false);
    }
  };

  const year = (r: TmdbSearchResult) => r.releaseDate?.split("-")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-purple-400" />
            <h2 className="font-bold text-white text-sm">Log Scrobble</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title Search */}
          <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="text-xs font-medium text-zinc-400">Title *</label>

            {selectedResult ? (
              /* Selected media card */
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800/70 border border-purple-500/30">
                {selectedResult.posterPath ? (
                  <img
                    src={selectedResult.posterPath}
                    alt={selectedResult.title}
                    className="w-8 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-12 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    {selectedResult.mediaType === "series" ? (
                      <Tv className="h-3.5 w-3.5 text-zinc-500" />
                    ) : (
                      <Film className="h-3.5 w-3.5 text-zinc-500" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{selectedResult.title}</p>
                  <p className="text-[10px] text-zinc-500">
                    {selectedResult.mediaType === "series" ? "Series" : "Movie"}
                    {year(selectedResult) ? ` · ${year(selectedResult)}` : ""}
                    {" · "}
                    <span className="text-purple-400">TMDB #{selectedResult.tmdbId}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              /* Search input */
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setTitle(e.target.value);
                  }}
                  placeholder="Search movie or series..."
                  className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 pl-9 pr-8"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400 animate-spin" />
                )}
              </div>
            )}

            {/* Search Dropdown */}
            {showDropdown && !selectedResult && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                {searchResults.map((r) => (
                  <button
                    key={`${r.tmdbId}-${r.mediaType}`}
                    type="button"
                    onClick={() => handleSelectResult(r)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                  >
                    {r.posterPath ? (
                      <img
                        src={r.posterPath}
                        alt={r.title}
                        className="w-7 h-10 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-10 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        {r.mediaType === "series" ? (
                          <Tv className="h-3 w-3 text-zinc-600" />
                        ) : (
                          <Film className="h-3 w-3 text-zinc-600" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.title}</p>
                      <p className="text-[10px] text-zinc-500">
                        {r.mediaType === "series" ? "Series" : "Movie"}
                        {year(r) ? ` · ${year(r)}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!selectedResult && query.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-[10px] text-zinc-600 mt-1">
                No results found. The title will be resolved automatically.
              </p>
            )}
          </div>

          {/* Media Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMediaType("movie")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  mediaType === "movie"
                    ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
                    : "bg-zinc-800/50 border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                Movie
              </button>
              <button
                type="button"
                onClick={() => setMediaType("episode")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  mediaType === "episode"
                    ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
                    : "bg-zinc-800/50 border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                <Tv className="h-3.5 w-3.5" />
                Episode
              </button>
            </div>
          </div>

          {/* Season/Episode (conditional) */}
          {mediaType === "episode" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Season</label>
                <Input
                  type="number"
                  min="1"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="1"
                  className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Episode</label>
                <Input
                  type="number"
                  min="1"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  placeholder="1"
                  className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
            </div>
          )}

          {/* Source */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Source</label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Netflix, Cinema, Blu-ray..."
              className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600"
            />
          </div>

          {/* Watched at */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Watched at</label>
            <Input
              type="datetime-local"
              value={watchedAt}
              onChange={(e) => setWatchedAt(e.target.value)}
              className="bg-zinc-800/50 border-white/10 text-white"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10 bg-transparent text-zinc-400 hover:text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !(title.trim() || query.trim())}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
            >
              {isSubmitting ? "Logging..." : "Log Scrobble"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
