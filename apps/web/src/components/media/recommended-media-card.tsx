"use client";

import Link from "next/link";
import Image from "next/image";
import { Film, Tv } from "lucide-react";
import { getMediaUrl, resolveImage } from "@/lib/utils";
import { FeedbackButtons } from "@/components/recommendations/feedback-buttons";
import type { SearchResult } from "@/types";

interface RecommendedMediaCardProps {
  media: SearchResult & { score?: number; explanation?: string };
  onDismiss?: (id: string) => void;
  compact?: boolean;
}

export function RecommendedMediaCard({ media, onDismiss, compact }: RecommendedMediaCardProps) {
  if (compact) {
    const href = getMediaUrl(media as any);
    const year = media.releaseDate ? new Date(media.releaseDate).getFullYear() : "";
    const poster = resolveImage(media.posterPath ?? null);
    return (
      <Link href={href} className="group flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-[60px] rounded overflow-hidden bg-zinc-800">
          {poster ? (
            <Image src={poster} alt={media.title} width={40} height={60} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {(media as any).type === "movie" ? <Film className="h-4 w-4 text-zinc-600" /> : <Tv className="h-4 w-4 text-zinc-600" />}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <p className="text-sm font-semibold text-zinc-100 group-hover:text-purple-400 transition-colors leading-tight line-clamp-2">{media.title}</p>
          {year && <p className="text-xs text-zinc-600 mt-0.5">{year}</p>}
          {media.explanation && <p className="text-[11px] text-purple-400/80 italic mt-1 line-clamp-1">{media.explanation}</p>}
        </div>
      </Link>
    );
  }

  const href = getMediaUrl(media as any);
  const year = media.releaseDate ? new Date(media.releaseDate).getFullYear() : "";

  return (
    <div className="group relative flex-shrink-0 w-[160px] md:w-[200px]">
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl">
        <div className="relative overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 shadow-md transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-purple-900/20 group-hover:border-purple-500/30 w-[160px] h-[240px] md:w-[200px] md:h-[300px]">
          {media.posterPath ? (
            <Image
              src={resolveImage(media.posterPath) || ""}
              alt={media.title}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-800">
              {(media as any).type === "movie" ? (
                <Film className="h-12 w-12 text-zinc-700" />
              ) : (
                <Tv className="h-12 w-12 text-zinc-700" />
              )}
            </div>
          )}

          {/* Feedback overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            <FeedbackButtons
              targetType="media"
              targetId={media.localId ?? String(media.id)}
              source="for_you_carousel"
              onDismiss={() => onDismiss?.(media.localId ?? String(media.id))}
              className="justify-center"
            />
          </div>

          <div
            className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium ${
              (media as any).type === "movie" ? "bg-purple-600" : "bg-pink-600"
            } text-white`}
          >
            {(media as any).type === "movie" ? "Movie" : "TV"}
          </div>
        </div>
      </Link>

      <div className="mt-3 w-[160px] md:w-[200px]">
        <h3 className="text-sm font-bold text-zinc-200 group-hover:text-purple-400 transition-colors truncate leading-tight">
          {media.title}
        </h3>
        {year && <p className="text-xs text-zinc-500 mt-0.5 font-medium">{year}</p>}
        {media.explanation && (
          <p className="text-[11px] text-purple-400/80 italic mt-1 line-clamp-2 leading-tight">
            {media.explanation}
          </p>
        )}
      </div>
    </div>
  );
}
