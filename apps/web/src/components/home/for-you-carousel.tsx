"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import {
  useMediaRecommendations,
  useRecommendationExplanations,
} from "@/hooks/queries/use-recommendations";
import { RecommendedMediaCard } from "@/components/media/recommended-media-card";
import { useSession } from "@/lib/auth-client";

export function ForYouCarousel() {
  const { data: session } = useSession();
  const ref = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data, isLoading } = useMediaRecommendations(
    { limit: 20, includeScores: true },
    !!session?.user,
  );

  const itemId = (m: { localId?: string | null; id?: string | number; mediaId?: string }) =>
    m.localId ?? m.mediaId ?? String(m.id ?? "");

  const items = (data?.data ?? []).filter((m) => !dismissed.has(itemId(m)));
  const mediaIds = items.map((m) => itemId(m));

  const { data: explanationsData } = useRecommendationExplanations(
    mediaIds,
    mediaIds.length > 0,
  );

  const explanationMap = new Map(
    (explanationsData?.data ?? []).map((e) => [
      e.targetMediaId,
      e.explanationText,
    ]),
  );

  const itemsWithExplanations = items.map((m) => ({
    ...m,
    explanation: m.explanation ?? explanationMap.get(itemId(m)),
  }));

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({
      left: dir === "left" ? -500 : 500,
      behavior: "smooth",
    });
  };

  if (!session?.user) return null;

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-bold text-zinc-200">For You</h2>
        </div>
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[160px] md:w-[200px]">
              <div className="w-full h-[240px] md:h-[300px] rounded-xl bg-zinc-900 animate-pulse" />
              <div className="mt-3 h-4 bg-zinc-800 rounded animate-pulse" />
              <div className="mt-1 h-3 w-2/3 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!itemsWithExplanations.length) return null;

  return (
    <div className="container mx-auto px-6 py-6">
      <div className="relative group/carousel">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-bold text-zinc-200">For You</h2>
            {data?.source === "cached" && (
              <span className="text-[11px] text-zinc-600 ml-1">personalized</span>
            )}
          </div>
        </div>

        {/* Fade edges */}
        <div className="absolute left-0 top-8 bottom-4 w-10 bg-gradient-to-r from-[#0d0d0f] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-8 bottom-4 w-10 bg-gradient-to-l from-[#0d0d0f] to-transparent z-10 pointer-events-none" />

        <button
          onClick={() => scroll("left")}
          aria-label="Previous"
          className="absolute left-0 top-[55%] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/80 border border-white/10 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black hover:border-white/20"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <button
          onClick={() => scroll("right")}
          aria-label="Next"
          className="absolute right-0 top-[55%] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/80 border border-white/10 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black hover:border-white/20"
        >
          <ChevronRight className="h-4 w-4 text-white" />
        </button>

        <div
          ref={ref}
          className="flex gap-4 overflow-x-auto pb-4 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {itemsWithExplanations.map((media) => (
            <div key={itemId(media)} style={{ scrollSnapAlign: "start" }}>
              <RecommendedMediaCard
                media={media}
                onDismiss={(id) =>
                  setDismissed((prev) => new Set([...prev, id]))
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
