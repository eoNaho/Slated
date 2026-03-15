"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Media } from "@/types";

interface HeroSectionProps {
  initialMedia?: Media[];
}

export function HeroSection({ initialMedia = [] }: HeroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredMedia, setFeaturedMedia] = useState<Media[]>(initialMedia);

  const nextSlide = () => {
    setCurrentSlide((prev) =>
      prev === featuredMedia.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentSlide((prev) =>
      prev === 0 ? featuredMedia.length - 1 : prev - 1
    );
  };

  // Auto-slide
  useEffect(() => {
    if (featuredMedia.length <= 1) return;
    const interval = setInterval(nextSlide, 8000);
    return () => clearInterval(interval);
  }, [featuredMedia.length]);

  const featured = featuredMedia[currentSlide];

  if (!featured || featuredMedia.length === 0) {
    return (
      <div className="h-[60vh] bg-gradient-to-br from-purple-900/30 via-black to-black rounded-xl flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to PixelReel
          </h2>
          <p className="text-zinc-400 mb-4">
            Start adding movies and series to see them here
          </p>
          <Link href="/search">
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
              Search Content
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="relative mb-16 overflow-hidden">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main Featured Content */}
        <Link
          href={`/${featured.type === "movie" ? "movies" : "series"}/${featured.id}`}
          className="relative h-[60vh] lg:h-[70vh] w-full lg:w-2/3 overflow-hidden rounded-xl group cursor-pointer"
        >
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out transform group-hover:scale-105"
            style={{
              backgroundImage: `url(${featured.backdropPath || featured.posterPath || ""})`,
              filter: "brightness(0.4)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

          {/* Navigation Arrows */}
          {featuredMedia.length > 1 && (
            <>
              <div className="absolute top-1/2 left-4 transform -translate-y-1/2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    prevSlide();
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              </div>
              <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    nextSlide();
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </>
          )}

          {/* Content */}
          <div className="absolute bottom-0 left-0 p-8 w-full">
            <span className="mb-6 inline-block px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium uppercase tracking-wider">
              Featured
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
              {featured.title}
            </h1>
            <div className="flex items-center mb-4 text-sm text-zinc-400">
              <span>
                {featured.releaseDate
                  ? new Date(featured.releaseDate).getFullYear()
                  : "N/A"}
              </span>
              <span className="mx-2">•</span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                {featured.type === "movie" ? "Movie" : "Series"}
              </span>
            </div>
            {featured.voteAverage && (
              <div className="flex items-center mb-6">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 mr-1" />
                <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {featured.voteAverage.toFixed(1)}
                </span>
                <span className="text-sm text-zinc-300 ml-1">/ 10</span>
              </div>
            )}
            {featured.overview && (
              <p className="text-zinc-300 mb-8 text-lg leading-relaxed max-w-3xl line-clamp-3">
                {featured.overview}
              </p>
            )}
            <div className="flex gap-4">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-lg">
                View Details
              </Button>
            </div>
          </div>

          {/* Slide indicators */}
          {featuredMedia.length > 1 && (
            <div className="absolute bottom-4 right-4 flex gap-1">
              {featuredMedia.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentSlide(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide ? "bg-purple-500" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}
        </Link>

        {/* Side Cards */}
        {featuredMedia.length > 2 && (
          <div className="lg:w-1/3 flex flex-col gap-4">
            {featuredMedia.slice(1, 3).map((media, index) => (
              <Link
                key={media.id}
                href={`/${media.type === "movie" ? "movies" : "series"}/${media.id}`}
                className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden h-1/2 rounded-lg group cursor-pointer relative"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${media.posterPath || ""})`,
                    filter: "brightness(0.3)",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                  <span
                    className={`mb-2 inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                      index === 0
                        ? "bg-gradient-to-r from-orange-500 to-red-500"
                        : "bg-gradient-to-r from-green-500 to-emerald-500"
                    } text-white`}
                  >
                    {index === 0 ? "Trending" : "Top Rated"}
                  </span>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {media.title}
                  </h3>
                  <div className="flex items-center text-sm text-zinc-400 mb-2">
                    <span>
                      {media.releaseDate
                        ? new Date(media.releaseDate).getFullYear()
                        : "N/A"}
                    </span>
                    <span className="mx-2">•</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                      {media.type === "movie" ? "Movie" : "Series"}
                    </span>
                  </div>
                  {media.voteAverage && (
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                      <span className="text-lg font-bold text-purple-400">
                        {media.voteAverage.toFixed(1)}
                      </span>
                      <span className="text-xs text-zinc-400 ml-1">/ 10</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
