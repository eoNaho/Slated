import Link from "next/link";
import { Play, ChevronRight, RotateCcw } from "lucide-react";
import { RatingStars } from "./rating-stars";
import type { DiaryEntry } from "@/types";
import { getMediaUrl } from "@/lib/utils";

interface RecentWatchesProps {
  entries: DiaryEntry[];
  limit?: number;
}

export function RecentWatches({ entries, limit = 6 }: RecentWatchesProps) {
  const displayEntries = entries.slice(0, limit);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Play className="h-5 w-5 text-green-500" />
          Recent Watches
        </h2>
        <Link
          href="#"
          className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
        >
          View diary <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {displayEntries.map((entry) => (
          <Link
            key={entry.id}
            href={entry.media ? getMediaUrl(entry.media) : "#"}
            className="group"
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 mb-2">
              {entry.media && (
                <img
                  src={entry.media.posterPath || ""}
                  alt={entry.media.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              {entry.isRewatch && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <RotateCcw className="h-3 w-3 text-white" />
                </div>
              )}
              {entry.rating && (
                <div className="absolute bottom-2 left-2">
                  <RatingStars rating={entry.rating} />
                </div>
              )}
            </div>
            <p className="text-sm text-zinc-300 group-hover:text-white truncate">
              {entry.media?.title}
            </p>
            <p className="text-xs text-zinc-600">
              {new Date(entry.watchedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
