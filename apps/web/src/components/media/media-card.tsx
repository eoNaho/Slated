"use client";

import Link from "next/link";
import { Star, Heart, Plus, Film, Tv } from "lucide-react";
import type { Media } from "@/types";
import { getMediaUrl } from "@/lib/utils";

interface MediaCardProps {
  media: Media;
  large?: boolean;
}

export function MediaCard({ media, large = false }: MediaCardProps) {
  const href = getMediaUrl(media);
  const year = media.releaseDate
    ? new Date(media.releaseDate).getFullYear()
    : "";

  return (
    <Link
      href={href}
      className="group relative flex-shrink-0 cursor-pointer focus-within:ring-2 focus-within:ring-purple-500 rounded-xl block"
    >
      <div
        className={`relative overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 shadow-md transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-purple-900/20 group-hover:border-purple-500/30 ${large ? "w-[280px] h-[420px]" : "w-[160px] h-[240px] md:w-[200px] md:h-[300px]"}`}
      >
        {media.posterPath ? (
          <img
            src={media.posterPath}
            alt={media.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-800">
            {media.type === "movie" ? (
              <Film className="h-12 w-12 text-zinc-700" />
            ) : (
              <Tv className="h-12 w-12 text-zinc-700" />
            )}
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <div className="flex items-center justify-between mb-2">
              {media.voteAverage && media.voteAverage > 0 && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-xs font-bold">
                    {media.voteAverage.toFixed(1)}
                  </span>
                </div>
              )}
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // TODO: Like functionality
                  }}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors focus:outline-none focus:bg-purple-600"
                  aria-label="Like"
                >
                  <Heart className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // TODO: Add to list
                  }}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors focus:outline-none focus:bg-purple-600"
                  aria-label="Add to list"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            {media.genres && media.genres.length > 0 && (
              <p className="text-xs text-zinc-300 line-clamp-1">
                {typeof media.genres[0] === "string"
                  ? media.genres[0]
                  : media.genres[0].name}
              </p>
            )}
          </div>
        </div>

        {/* Type Badge */}
        <div
          className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium ${
            media.type === "movie" ? "bg-purple-600" : "bg-pink-600"
          } text-white`}
        >
          {media.type === "movie" ? "Movie" : "TV"}
        </div>
      </div>

      <div className={`mt-3 ${large ? "w-[280px]" : "w-[160px] md:w-[200px]"}`}>
        <h3 className="text-sm font-bold text-zinc-200 group-hover:text-purple-400 transition-colors truncate leading-tight">
          {media.title}
        </h3>
        {year && (
          <p className="text-xs text-zinc-500 mt-1 font-medium">{year}</p>
        )}
      </div>
    </Link>
  );
}
