"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Play,
  Plus,
  Star,
  ChevronRight,
  ChevronLeft,
  Clock,
  Pause,
} from "lucide-react";
import type { Media } from "@/types";
import { resolveImage } from "@/lib/utils";

interface HeroSliderProps {
  media: Media[];
}

export function HeroSlider({ media }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
    setProgress(0);
  }, [media.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
    setProgress(0);
  }, [media.length]);

  const setSlide = useCallback(
    (index: number) => {
      if (index === currentIndex) return;
      setCurrentIndex(index);
      setProgress(0);
    },
    [currentIndex]
  );

  useEffect(() => {
    if (isPaused || media.length <= 1) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + 1;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [nextSlide, isPaused, media.length]);

  if (!media.length) {
    return (
      <header className="relative w-full min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to PixelReel
          </h2>
          <p className="text-zinc-400 mb-4">
            Discover trending movies and series
          </p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Search Content
          </Link>
        </div>
      </header>
    );
  }

  const activeSlide = media[currentIndex];
  const backdropUrl = activeSlide.backdropPath || activeSlide.posterPath || "";
  const year = activeSlide.releaseDate
    ? new Date(activeSlide.releaseDate).getFullYear()
    : "";

  return (
    <header
      className="relative w-full min-h-[85vh] md:h-[90vh] overflow-hidden flex items-center pt-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      role="region"
      aria-label="Featured content slider"
    >
      {/* Background Layer */}
      {media.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? "opacity-100" : "opacity-0"}`}
          aria-hidden={index !== currentIndex}
        >
          <Image
            fill
            src={resolveImage(slide.backdropPath || slide.posterPath, "original") || slide.backdropPath || slide.posterPath || ""}
            alt=""
            className="object-cover"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
          <div className="absolute inset-0 bg-zinc-950/20" />
        </div>
      ))}

      <div className="container mx-auto px-6 relative z-10 w-full pt-12 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end lg:items-center">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8 animate-fade-in-up">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-md bg-white/10 backdrop-blur-md border border-white/10 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
                  #{currentIndex + 1} Featured
                </span>
                {activeSlide.voteAverage && activeSlide.voteAverage > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="text-xs font-bold">
                      {activeSlide.voteAverage.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter drop-shadow-2xl">
                {activeSlide.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-zinc-300 text-sm md:text-base font-medium">
                {year && <span className="text-white">{year}</span>}
                {year && (
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {activeSlide.type === "movie" ? "Movie" : "Series"}
                </span>
                {activeSlide.genres && activeSlide.genres.length > 0 && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    <div className="flex gap-2">
                      {activeSlide.genres.slice(0, 2).map((g) => (
                        <span
                          key={typeof g === "string" ? g : g.id}
                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-xs text-zinc-300"
                        >
                          {typeof g === "string" ? g : g.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {activeSlide.overview && (
                <p className="text-zinc-300 text-base md:text-xl max-w-2xl leading-relaxed drop-shadow-md line-clamp-3 md:line-clamp-none">
                  {activeSlide.overview}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href={`/${activeSlide.type === "movie" ? "movies" : "series"}/${activeSlide.tmdbId || activeSlide.id}${activeSlide.tmdbId ? "?tmdb=true" : ""}`}
                className="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-medium bg-purple-600 text-white hover:bg-purple-700 shadow-xl hover:shadow-purple-600/30 transition-all"
              >
                <Play className="mr-2 h-4 w-4" />
                View Details
              </Link>
              <button className="inline-flex items-center justify-center rounded-full px-6 py-4 text-base font-medium bg-zinc-800/80 backdrop-blur-sm text-white hover:bg-zinc-700 border border-white/10 transition-colors">
                <Plus className="mr-2 h-4 w-4" />
                Watchlist
              </button>
            </div>
          </div>

          {/* Up Next List */}
          <div className="hidden lg:block lg:col-span-4 h-full pl-8 border-l border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-zinc-400 text-sm font-bold uppercase tracking-widest">
                Up Next
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={prevSlide}
                  className="p-2 hover:bg-white/10 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-2 hover:bg-white/10 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label={isPaused ? "Resume autoplay" : "Pause autoplay"}
                >
                  {isPaused ? (
                    <Play size={14} className="ml-0.5" />
                  ) : (
                    <Pause size={14} />
                  )}
                </button>
                <button
                  onClick={nextSlide}
                  className="p-2 hover:bg-white/10 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="Next slide"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3" role="list">
              {media.slice(0, 5).map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setSlide(idx)}
                  role="listitem"
                  aria-current={idx === currentIndex ? "true" : "false"}
                  className={`group relative flex items-center gap-4 p-3 rounded-xl transition-all duration-300 text-left w-full outline-none focus:ring-2 focus:ring-purple-500/50 ${
                    idx === currentIndex
                      ? "bg-white/10 shadow-lg ring-1 ring-white/10 scale-[1.02]"
                      : "hover:bg-white/5 opacity-60 hover:opacity-100"
                  }`}
                >
                  {/* Progress Bar */}
                  {idx === currentIndex && (
                    <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-purple-500/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-400 transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}

                  <div className="w-12 h-16 rounded-md overflow-hidden flex-shrink-0 relative bg-zinc-800">
                    <Image
                      fill
                      src={slide.posterPath || ""}
                      alt=""
                      className="object-cover"
                    />
                    {idx === currentIndex && !isPaused && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-1 h-3 bg-white animate-pulse" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pb-1">
                    <h4
                      className={`font-bold text-sm truncate ${idx === currentIndex ? "text-purple-100" : "text-zinc-300"}`}
                    >
                      {slide.title}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                      <span>
                        {slide.releaseDate
                          ? new Date(slide.releaseDate).getFullYear()
                          : ""}
                      </span>
                      <span className="w-0.5 h-0.5 rounded-full bg-zinc-600"></span>
                      <span>{slide.type === "movie" ? "Movie" : "Series"}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
