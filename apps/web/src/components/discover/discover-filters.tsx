"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Genre {
  id: number | string;
  name: string;
}

interface StreamingService {
  id: string;
  name: string;
  logoPath?: string | null;
}

interface DiscoverFiltersProps {
  genres: Genre[];
  streamingServices: StreamingService[];
  filters: {
    type: string;
    genre: string;
    year: string;
    sortBy: string;
    streaming: string;
  };
  onChange: (filters: { type: string; genre: string; year: string; sortBy: string; streaming: string }) => void;
}

export function DiscoverFilters({
  genres,
  streamingServices,
  filters,
  onChange,
}: DiscoverFiltersProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const updateFilter = (key: string, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onChange({
      type: "all",
      genre: "",
      year: "",
      sortBy: "popularity",
      streaming: "",
    });
  };

  const hasActiveFilters =
    filters.type !== "all" ||
    filters.genre ||
    filters.year ||
    filters.streaming ||
    filters.sortBy !== "popularity";

  return (
    <div className="space-y-6">
      {/* Quick Type Toggles */}
      <div className="flex items-center justify-between">
        <div className="flex p-1 bg-zinc-900/50 rounded-xl border border-white/5 backdrop-blur-md">
          {[
            { id: "all", label: "All" },
            { id: "movie", label: "Movies" },
            { id: "series", label: "Series" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => updateFilter("type", t.id)}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                filters.type === t.id
                  ? "bg-white text-black shadow-lg"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium",
            isOpen || hasActiveFilters
              ? "bg-purple-500/10 border-purple-500/50 text-purple-400"
              : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white",
          )}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-zinc-900/30 rounded-3xl border border-white/5 backdrop-blur-sm space-y-8">
              {/* Genres */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Genres
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateFilter("genre", "")}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all",
                      !filters.genre
                        ? "bg-white border-white text-black"
                        : "bg-transparent border-white/5 text-zinc-500 hover:border-white/20 hover:text-zinc-300",
                    )}
                  >
                    All Genres
                  </button>
                  {genres.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => updateFilter("genre", String(g.id))}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all",
                        filters.genre === String(g.id)
                          ? "bg-purple-500 border-purple-400 text-white"
                          : "bg-transparent border-white/5 text-zinc-500 hover:border-white/20 hover:text-zinc-300",
                      )}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Streaming Services */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Streaming On
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {streamingServices.map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          updateFilter(
                            "streaming",
                            filters.streaming === s.id ? "" : s.id,
                          )
                        }
                        className={cn(
                          "w-10 h-10 rounded-xl border transition-all overflow-hidden flex items-center justify-center p-1.5 bg-zinc-950",
                          filters.streaming === s.id
                            ? "border-purple-500/50 ring-2 ring-purple-500/10"
                            : "border-white/5 hover:border-white/10 opacity-40 hover:opacity-100",
                        )}
                        title={s.name}
                      >
                        {s.logoPath ? (
                          <img
                            src={s.logoPath}
                            alt={s.name}
                            className="w-full h-full object-contain rounded-[4px]"
                          />
                        ) : (
                          <span className="text-[8px] font-bold">
                            {s.name.slice(0, 3)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Years */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Year
                  </label>
                  <select
                    value={filters.year}
                    onChange={(e) => updateFilter("year", e.target.value)}
                    className="w-full h-11 bg-zinc-950 border border-white/5 rounded-xl px-4 text-sm font-medium text-zinc-400 outline-none focus:border-purple-500/50 transition-colors appearance-none"
                  >
                    <option value="">All Years</option>
                    {Array.from(
                      { length: 50 },
                      (_, i) => new Date().getFullYear() - i,
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilter("sortBy", e.target.value)}
                    className="w-full h-11 bg-zinc-950 border border-white/5 rounded-xl px-4 text-sm font-medium text-zinc-400 outline-none focus:border-purple-500/50 transition-colors appearance-none"
                  >
                    <option value="popularity">Most Popular</option>
                    <option value="rating">Top Rated</option>
                    <option value="releaseDate">Release Date</option>
                    <option value="title">Alphabetical</option>
                  </select>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <button
                  onClick={clearFilters}
                  className="text-xs font-bold text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                >
                  Reset All
                </button>
                <div className="flex gap-2">
                  {hasActiveFilters && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider">
                      {
                        Object.values(filters).filter(
                          (v) => v && v !== "all" && v !== "popularity",
                        ).length
                      }{" "}
                      Active Filters
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
