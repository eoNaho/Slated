"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Search, Popcorn, Tv, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchAutocomplete } from "@/hooks/queries/use-search";
import { useClickOutside } from "@/hooks/use-click-outside";
import type { SearchResult } from "@/types";

interface MediaSearchInputProps {
  value?: Pick<
    SearchResult,
    "id" | "title" | "posterPath" | "mediaType" | "localId" | "localSlug"
  > | null;
  onChange: (
    value: Pick<
      SearchResult,
      "id" | "title" | "posterPath" | "mediaType" | "localId" | "localSlug"
    > | null,
  ) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function MediaSearchInput({
  value,
  onChange,
  placeholder = "Search movies and series...",
  className = "",
  autoFocus = false,
}: MediaSearchInputProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [manualClose, setManualClose] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: autocompleteData, isPending: isLoading } =
    useSearchAutocomplete(!value ? debouncedQuery : "");
  const results: SearchResult[] = autocompleteData ?? [];

  const isOpen = !!debouncedQuery && results.length > 0 && !manualClose;

  useClickOutside(dropdownRef, () => setManualClose(true));

  const handleSelect = (item: SearchResult) => {
    onChange({
      id: item.id,
      title: item.title,
      posterPath: item.posterPath,
      mediaType: item.mediaType,
      localId: item.localId,
      localSlug: item.localSlug,
    });
    setQuery("");
    setManualClose(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    if (inputRef.current) inputRef.current.focus();
  };

  if (value) {
    return (
      <div
        className={`relative flex items-center gap-3 p-2 rounded-xl bg-[#1a1525]/80 border border-white/10 ${className}`}
      >
        <div className="relative h-12 w-8 shrink-0 rounded-md overflow-hidden bg-black/50">
          {value.posterPath ? (
            <Image
              src={value.posterPath}
              alt={value.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/20">
              {value.mediaType === "movie" ? (
                <Popcorn className="h-4 w-4" />
              ) : (
                <Tv className="h-4 w-4" />
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {value.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded-sm">
              {value.mediaType}
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setManualClose(false); }}
          onFocus={() => setManualClose(false)}
          placeholder={placeholder}
          className="pl-9 bg-[#1a1525]/80 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-amber-500/50"
          autoFocus={autoFocus}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 p-1 rounded-xl bg-[#0f0a14] border border-white/10 shadow-xl z-50 overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
              >
                <div className="relative h-12 w-8 shrink-0 rounded-md overflow-hidden bg-black/50">
                  {item.posterPath ? (
                    <Image
                      src={item.posterPath}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20">
                      {item.mediaType === "movie" ? (
                        <Popcorn className="h-4 w-4" />
                      ) : (
                        <Tv className="h-4 w-4" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 group-hover:text-white truncate">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-white/40">
                    <span className="capitalize">{item.mediaType}</span>
                    {item.releaseDate && (
                      <>
                        <span>•</span>
                        <span>
                          {format(new Date(item.releaseDate), "yyyy")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && query && !isLoading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 rounded-xl bg-[#0f0a14] border border-white/10 shadow-xl z-50 text-center text-sm text-white/50">
          No results found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
