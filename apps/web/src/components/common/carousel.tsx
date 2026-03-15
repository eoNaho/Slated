"use client";

import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeader } from "./section-header";

interface CarouselProps {
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
}

export function Carousel({ title, subtitle, href, children }: CarouselProps) {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainer.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [children]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainer.current) {
      const scrollAmount =
        direction === "left"
          ? -scrollContainer.current.clientWidth / 1.5
          : scrollContainer.current.clientWidth / 1.5;
      scrollContainer.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 500);
    }
  };

  return (
    <section
      className="container mx-auto px-6 py-12 relative group/carousel"
      aria-label={title}
    >
      <SectionHeader title={title} subtitle={subtitle} href={href} />

      {/* Navigation Buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/80 hover:bg-zinc-800 text-white rounded-full hidden md:flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/80 hover:bg-zinc-800 text-white rounded-full hidden md:flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Scroll Container */}
      <div
        ref={scrollContainer}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-xl"
        tabIndex={0}
        role="list"
        aria-label={`${title} items`}
      >
        {children}
      </div>
    </section>
  );
}
