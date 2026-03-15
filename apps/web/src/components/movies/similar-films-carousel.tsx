"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Film } from "lucide-react";
import type { SearchResult } from "@/types";
import { slugify } from "@/lib/utils";

interface SimilarFilmsCarouselProps {
  films: SearchResult[];
}

export function SimilarFilmsCarousel({ films }: SimilarFilmsCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -500 : 500, behavior: "smooth" });
  };

  if (!films.length) return null;

  return (
    <div className="relative group/carousel">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-4 w-10 bg-gradient-to-r from-[#0d0d0f] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-4 w-10 bg-gradient-to-l from-[#0d0d0f] to-transparent z-10 pointer-events-none" />

      {/* Arrows */}
      <button
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        className="absolute left-0 top-[42%] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/80 border border-white/10 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-black hover:border-white/20"
      >
        <ChevronLeft className="h-4 w-4 text-white" />
      </button>
      <button
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        className="absolute right-0 top-[42%] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/80 border border-white/10 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-black hover:border-white/20"
      >
        <ChevronRight className="h-4 w-4 text-white" />
      </button>

      {/* Track */}
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto pb-4 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {films.slice(0, 20).map((film) => {
          const href = `/movies/${film.localSlug ?? slugify(film.title)}`;
          const filmYear = film.releaseDate ? new Date(film.releaseDate).getFullYear() : null;

          return (
            <Link
              key={film.id}
              href={href}
              className="group/card flex-shrink-0"
              style={{ scrollSnapAlign: "start", width: 130 }}
            >
              <div
                className="relative rounded-lg overflow-hidden bg-zinc-900 mb-2.5 ring-1 ring-white/[0.06] group-hover/card:ring-amber-400/40 transition-all duration-300"
                style={{ width: 130, height: 195 }}
              >
                {film.posterPath ? (
                  <Image
                    src={film.posterPath}
                    alt={film.title}
                    fill
                    className="object-cover group-hover/card:scale-105 transition-transform duration-500"
                    sizes="130px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="h-8 w-8 text-zinc-700" />
                  </div>
                )}
                {/* Rating badge */}
                {film.voteAverage && film.voteAverage > 0 ? (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-bold text-amber-400 leading-none">
                    ★ {film.voteAverage.toFixed(1)}
                  </div>
                ) : null}
              </div>
              <p className="text-xs font-semibold text-zinc-200 group-hover/card:text-amber-400 transition-colors leading-tight line-clamp-2">
                {film.title}
              </p>
              {filmYear && (
                <p className="text-[11px] text-zinc-600 mt-0.5">{filmYear}</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
