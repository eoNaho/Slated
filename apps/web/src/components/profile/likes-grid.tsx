import Link from "next/link";
import Image from "next/image";
import { Heart, Film, Tv } from "lucide-react";
import type { LikeItem } from "@/types";
import { getMediaUrl } from "@/lib/utils";

interface LikesGridProps {
  items: LikeItem[];
  customCovers?: Record<string, string>;
}

export function LikesGrid({ items, customCovers }: LikesGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <Heart className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No likes yet</h3>
        <p className="text-zinc-500">Films you like will appear here.</p>
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

            {/* Like Badge */}
            <div className="absolute top-2 right-2">
              <div className="bg-red-500 rounded-full p-1.5">
                <Heart className="h-3 w-3 text-white fill-white" />
              </div>
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
