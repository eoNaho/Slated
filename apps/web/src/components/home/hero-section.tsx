"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Star, BookmarkPlus } from "lucide-react";
import type { Media } from "@/types";

interface HeroSectionProps {
  initialMedia?: Media[];
}

export function HeroSection({ initialMedia = [] }: HeroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const featuredMedia = initialMedia;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) =>
      prev === featuredMedia.length - 1 ? 0 : prev + 1
    );
  }, [featuredMedia.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) =>
      prev === 0 ? featuredMedia.length - 1 : prev - 1
    );
  }, [featuredMedia.length]);

  useEffect(() => {
    if (featuredMedia.length <= 1) return;
    const interval = setInterval(nextSlide, 7000);
    return () => clearInterval(interval);
  }, [featuredMedia.length, nextSlide]);

  const featured = featuredMedia[currentSlide];

  if (!featured || featuredMedia.length === 0) {
    return (
      <div className="h-[70vh] bg-zinc-900 border-b border-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <h2
            className="text-2xl font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Welcome to PixelReel
          </h2>
          <p className="text-zinc-400 mb-4">Discover and review films &amp; series</p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold px-6 py-2.5 rounded-full hover:from-purple-500 hover:to-pink-500 transition-all text-sm"
          >
            Browse Catalog
          </Link>
        </div>
      </div>
    );
  }

  const backdropUrl = featured.backdropPath || featured.posterPath || "";
  const year = featured.releaseDate
    ? new Date(featured.releaseDate).getFullYear()
    : null;

  return (
    <section className="relative border-b border-zinc-800 overflow-hidden" style={{ minHeight: "72vh" }}>
      {/* Backdrop */}
      {backdropUrl && (
        <div className="absolute inset-0">
          <Image
            src={backdropUrl}
            alt=""
            fill
            className="object-cover"
            style={{ filter: "brightness(0.18) saturate(0.7)" }}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
        </div>
      )}

      <div className="relative z-10 container mx-auto px-6 py-16 flex items-center min-h-[72vh]">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-center w-full">

          {/* Text Content — 3/5 */}
          <div className="lg:col-span-3 space-y-6">
            {/* Meta */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-400 text-xs font-semibold tracking-widest uppercase">
                {featured.type === "movie" ? "Film" : "Series"}
              </span>
              {year && (
                <span className="text-zinc-500 text-sm">{year}</span>
              )}
              {featured.voteAverage && featured.voteAverage > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold text-zinc-300">
                    {featured.voteAverage.toFixed(1)}
                  </span>
                  <span className="text-zinc-600 text-xs">/ 10</span>
                </div>
              )}
            </div>

            {/* Title */}
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              {featured.title}
            </h1>

            {/* Overview */}
            {featured.overview && (
              <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl line-clamp-3">
                {featured.overview}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap pt-2">
              <Link
                href={`/${featured.type === "movie" ? "movies" : "series"}/${featured.id}`}
                className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-6 py-2.5 rounded-full transition-all text-sm shadow-lg shadow-purple-900/30"
              >
                View Details
              </Link>
              <button className="inline-flex items-center gap-2 border border-zinc-700 text-zinc-300 font-medium px-5 py-2.5 rounded-full hover:border-zinc-500 hover:text-white transition-colors text-sm">
                <BookmarkPlus className="h-4 w-4" />
                Watchlist
              </button>
            </div>

            {/* Slide controls */}
            {featuredMedia.length > 1 && (
              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={prevSlide}
                  className="p-2 rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white transition-colors"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  {featuredMedia.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === currentSlide
                          ? "w-6 h-1.5 bg-purple-500"
                          : "w-1.5 h-1.5 bg-zinc-700 hover:bg-zinc-500"
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={nextSlide}
                  className="p-2 rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white transition-colors"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Poster — 2/5 */}
          <div className="hidden lg:flex lg:col-span-2 items-center justify-center">
            <Link
              href={`/${featured.type === "movie" ? "movies" : "series"}/${featured.id}`}
              className="group relative block"
            >
              <div className="relative w-[260px] aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.8)] ring-1 ring-white/10 rotate-1 group-hover:rotate-0 transition-transform duration-500">
                {featured.posterPath ? (
                  <Image
                    src={featured.posterPath}
                    alt={featured.title}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <Star className="h-12 w-12 text-zinc-700" />
                  </div>
                )}
              </div>
              {/* Glow below poster */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-purple-500/10 rounded-full blur-xl" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
