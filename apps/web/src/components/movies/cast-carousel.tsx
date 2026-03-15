"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Credit } from "@/types";

interface CastCarouselProps {
  cast: Credit[];
}

export function CastCarousel({ cast }: CastCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  if (!cast.length) return null;

  return (
    <div className="relative group/carousel">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-[#0d0d0f] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-[#0d0d0f] to-transparent z-10 pointer-events-none" />

      {/* Scroll arrows */}
      <button
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        className="absolute left-0 top-[45%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 border border-white/10 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-black"
      >
        <ChevronLeft className="h-4 w-4 text-white" />
      </button>
      <button
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        className="absolute right-0 top-[45%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 border border-white/10 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-black"
      >
        <ChevronRight className="h-4 w-4 text-white" />
      </button>

      {/* Track */}
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto pb-4 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {cast.slice(0, 24).map((credit) => (
          <Link
            key={credit.id}
            href={`/people/${credit.person.id}`}
            className="group/card flex-shrink-0"
            style={{ scrollSnapAlign: "start", width: 108 }}
          >
            <div className="relative rounded-lg overflow-hidden bg-zinc-900 mb-2 ring-1 ring-white/[0.06] group-hover/card:ring-amber-400/40 transition-all duration-300" style={{ width: 108, height: 160 }}>
              {credit.person.profilePath ? (
                <Image
                  src={credit.person.profilePath}
                  alt={credit.person.name}
                  fill
                  className="object-cover object-top group-hover/card:scale-105 transition-transform duration-500"
                  sizes="108px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-3xl select-none">
                  <span>👤</span>
                </div>
              )}
              {/* Subtle bottom gradient */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            <p className="text-xs font-semibold text-zinc-200 group-hover/card:text-amber-400 transition-colors leading-tight truncate">
              {credit.person.name}
            </p>
            {credit.character && (
              <p className="text-[11px] text-zinc-600 truncate mt-0.5 leading-tight">
                {credit.character}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
