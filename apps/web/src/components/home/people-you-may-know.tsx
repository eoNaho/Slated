"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useUserRecommendations } from "@/hooks/queries/use-recommendations";
import { UserRecommendationCard } from "./user-recommendation-card";
import { useSession } from "@/lib/auth-client";

export function PeopleYouMayKnow() {
  const { data: session } = useSession();
  const ref = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data, isLoading } = useUserRecommendations({ limit: 20 }, !!session?.user);

  const users = (data?.data ?? []).filter((u) => !dismissed.has(u.id));

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  if (!session?.user || isLoading) return null;
  if (!users.length) return null;

  return (
    <div className="container mx-auto px-6 py-6">
      <div className="relative group/carousel">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-bold text-zinc-200">People You May Know</h2>
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
          className="flex gap-6 overflow-x-auto pb-4 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {users.map((user) => (
            <div key={user.id} style={{ scrollSnapAlign: "start" }}>
              <UserRecommendationCard
                user={user}
                onDismiss={(id) => setDismissed((prev) => new Set([...prev, id]))}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
