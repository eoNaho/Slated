import Link from "next/link";
import { Film, Grid, LayoutGrid, Filter } from "lucide-react";
import type { DiaryEntry } from "@/types";
import { getMediaUrl, resolveImage } from "@/lib/utils";

interface FilmsGridProps {
  entries: DiaryEntry[];
}

export function FilmsGrid({ entries }: FilmsGridProps) {
  // Extract unique films from diary entries
  const films = entries.map((e) => e.media).filter(Boolean);

  if (films.length === 0) {
    return (
      <div className="text-center py-16">
        <Film className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No films yet</h3>
        <p className="text-zinc-500">Start watching and logging films!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-sm">{films.length} films</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <Filter className="h-4 w-4" />
          </button>
          <button className="p-2 bg-white/5 rounded-lg text-white">
            <Grid className="h-4 w-4" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {films.map((film, idx) => (
          <Link
            key={`${film?.id}-${idx}`}
            href={film ? getMediaUrl(film) : "#"}
            className="group relative aspect-[2/3] rounded overflow-hidden bg-zinc-900"
          >
            {film && (
              <img
                src={resolveImage(film.posterPath) ?? ""}
                alt={film.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-center p-2">
                <p className="text-white text-xs font-medium line-clamp-2">
                  {film?.title}
                </p>
                <p className="text-zinc-400 text-[10px]">{film?.year}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
