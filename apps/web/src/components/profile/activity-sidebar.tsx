import { Clock, Heart, Eye, Filter } from "lucide-react";
import { RatingStars } from "./rating-stars";
import { resolveImage } from "@/lib/utils";
import type { DiaryEntry } from "@/types";

interface ActivitySidebarProps {
  entries: DiaryEntry[];
  limit?: number;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivitySidebar({ entries, limit = 5 }: ActivitySidebarProps) {
  const displayEntries = entries.slice(0, limit);

  return (
    <section className="bg-zinc-900/20 rounded-3xl p-6 border border-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-400" />
          Activity
        </h3>
        <Filter className="h-4 w-4 text-zinc-600 cursor-pointer hover:text-white transition-colors" />
      </div>

      <div className="space-y-5 relative">
        {/* Vertical Line */}
        <div className="absolute left-3.5 top-2 bottom-2 w-px bg-zinc-800" />

        {displayEntries.map((item) => (
          <div key={item.id} className="relative flex items-start gap-4 group">
            <div className="relative z-10 shrink-0 mt-0.5">
              <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:border-purple-500 transition-colors">
                {item.rating && item.rating >= 4 ? (
                  <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                ) : (
                  <Eye className="h-3 w-3 text-zinc-500" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 bg-zinc-900/50 p-3 rounded-xl border border-white/5 hover:bg-zinc-800 hover:border-white/10 transition-all cursor-pointer">
              <div className="flex gap-3">
                {item.media?.posterPath && (
                  <img
                    src={resolveImage(item.media.posterPath) ?? ""}
                    alt={item.media.title}
                    className="w-10 h-14 object-cover rounded shadow-sm"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-white truncate pr-2">
                      {item.media?.title || "Unknown"}
                    </p>
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {formatTimeAgo(item.watchedAt)}
                    </span>
                  </div>
                  {item.rating && (
                    <div className="mt-1">
                      <RatingStars rating={item.rating} size="xs" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        item.media?.type === "movie"
                          ? "bg-purple-500/10 text-purple-400"
                          : "bg-pink-500/10 text-pink-400"
                      }`}
                    >
                      {item.media?.type === "movie" ? "Film" : "Series"}
                    </span>
                    {item.isRewatch && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                        Rewatch
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
