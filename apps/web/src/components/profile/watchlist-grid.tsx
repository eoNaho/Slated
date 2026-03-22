import Link from "next/link";
import Image from "next/image";
import { Clock, Film, Tv, Flame } from "lucide-react";
import type { WatchlistItem } from "@/types";
import { getMediaUrl } from "@/lib/utils";

interface WatchlistGridProps {
  items: WatchlistItem[];
  customCovers?: Record<string, string>;
}

const priorityColors = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-zinc-500",
};

const priorityLabels = {
  high: "High Priority",
  medium: "Medium",
  low: "Low",
};

export function WatchlistGrid({ items, customCovers }: WatchlistGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">
          Watchlist is empty
        </h3>
        <p className="text-zinc-500">Start adding films you want to watch!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {items.map((item) => (
        <Link key={item.id} href={getMediaUrl(item.media)} className="group">
          <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 mb-2">
            <Image
              fill
              src={customCovers?.[item.media.id] || item.media.posterPath || ""}
              alt={item.media.title}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Priority Badge */}
            <div className="absolute top-2 right-2 flex items-center gap-1">
              {item.priority === "high" && (
                <div className="bg-red-500/90 backdrop-blur-sm rounded-full p-1.5">
                  <Flame className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            {/* Type Badge */}
            <div className="absolute top-2 left-2">
              <div
                className={`${item.media.type === "movie" ? "bg-purple-600" : "bg-pink-600"} rounded px-1.5 py-0.5`}
              >
                {item.media.type === "movie" ? (
                  <Film className="h-3 w-3 text-white" />
                ) : (
                  <Tv className="h-3 w-3 text-white" />
                )}
              </div>
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
              <span
                className={`text-xs px-2 py-0.5 rounded ${priorityColors[item.priority]}`}
              >
                {priorityLabels[item.priority]}
              </span>
            </div>
          </div>
          <p className="text-sm text-zinc-300 group-hover:text-white truncate">
            {item.media.title}
          </p>
          <p className="text-xs text-zinc-600">{item.media.year}</p>
        </Link>
      ))}
    </div>
  );
}
