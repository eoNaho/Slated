"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Film, Check } from "lucide-react";
import { api } from "@/lib/api";
import { resolveImage } from "@/lib/utils";
import type { SearchResult } from "@/types";

interface SeedMoviePickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  minRequired?: number;
}

export function SeedMoviePicker({ selected, onChange, minRequired = 5 }: SeedMoviePickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await api.search.search(q, { limit: 12 });
      setResults((res.media ?? []).filter((r) => r.mediaType === "movie" || r.mediaType === "series").slice(0, 12));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-4">
        Pick at least {minRequired} movies or shows you've watched and enjoyed.
      </p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search movies and shows..."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {loading && (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {results.map((item) => {
            const itemId = item.localId ?? String(item.id);
            const isSelected = selected.includes(itemId);
            const poster = resolveImage(item.posterPath ?? null);
            return (
              <button
                key={itemId}
                onClick={() => toggle(itemId)}
                className={`relative aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all ${
                  isSelected ? "border-purple-500 scale-95" : "border-transparent hover:border-zinc-600"
                }`}
                title={item.title}
              >
                {poster ? (
                  <Image src={poster} alt={item.title} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <Film className="h-6 w-6 text-zinc-600" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute inset-0 bg-purple-600/40 flex items-center justify-center">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-zinc-600 mt-3">
        {selected.length} selected
        {selected.length < minRequired && ` — pick ${minRequired - selected.length} more`}
      </p>
    </div>
  );
}
