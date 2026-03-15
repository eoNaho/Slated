import Link from "next/link";
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { RatingStars } from "./rating-stars";
import type { DiaryEntry } from "@/types";
import { getMediaUrl } from "@/lib/utils";

interface FilmsDiaryProps {
  entries: DiaryEntry[];
}

// Group entries by month
function groupByMonth(entries: DiaryEntry[]): Record<string, DiaryEntry[]> {
  const groups: Record<string, DiaryEntry[]> = {};

  entries.forEach((entry) => {
    const date = new Date(entry.watchedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  });

  return groups;
}

function formatMonthYear(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function FilmsDiary({ entries }: FilmsDiaryProps) {
  const groupedEntries = groupByMonth(entries);
  const months = Object.keys(groupedEntries).sort().reverse();

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <CalendarIcon className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Diary is empty</h3>
        <p className="text-zinc-500">
          Start logging films to build your diary!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-purple-400" />
          <span className="text-white font-bold">2024</span>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Entries by Month */}
      {months.map((monthKey) => (
        <div key={monthKey}>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-purple-400" />
            {formatMonthYear(monthKey)}
            <span className="text-zinc-500 font-normal text-sm">
              ({groupedEntries[monthKey].length} films)
            </span>
          </h3>

          <div className="space-y-2">
            {groupedEntries[monthKey].map((entry) => {
              const date = new Date(entry.watchedAt);

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors group"
                >
                  {/* Date */}
                  <div className="w-12 text-center flex-shrink-0">
                    <div className="text-2xl font-bold text-white">
                      {date.getDate()}
                    </div>
                    <div className="text-xs text-zinc-500 uppercase">
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                  </div>

                  {/* Poster */}
                  {entry.media && (
                    <Link
                      href={getMediaUrl(entry.media)}
                      className="flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-zinc-800"
                    >
                      <img
                        src={entry.media.posterPath || ""}
                        alt={entry.media.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </Link>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {entry.media && (
                        <Link
                          href={getMediaUrl(entry.media)}
                          className="font-bold text-white hover:text-purple-400 transition-colors truncate"
                        >
                          {entry.media.title}
                        </Link>
                      )}
                      <span className="text-zinc-500 text-sm">
                        {entry.media?.year}
                      </span>
                      {entry.isRewatch && (
                        <div className="flex items-center gap-1 text-blue-400 text-xs">
                          <RotateCcw className="h-3 w-3" />
                          Rewatch
                        </div>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="text-zinc-500 text-sm mt-1 truncate">
                        {entry.notes}
                      </p>
                    )}
                  </div>

                  {/* Rating */}
                  {entry.rating && (
                    <div className="flex-shrink-0">
                      <RatingStars rating={entry.rating} size="sm" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
