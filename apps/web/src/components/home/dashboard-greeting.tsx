"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, Calendar, TrendingUp } from "lucide-react";
import type { Media } from "@/types";
import { resolveImage } from "@/lib/utils";

interface DashboardGreetingProps {
  user: {
    name: string;
    username: string;
    image?: string | null;
  };
  featuredRecommendation?: Media | null;
}

export function DashboardGreeting({
  user,
  featuredRecommendation,
}: DashboardGreetingProps) {
  const firstName = user.name?.split(" ")[0] || user.username;
  const hour = new Date().getHours();

  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";

  const backdropUrl = featuredRecommendation
    ? resolveImage(
        featuredRecommendation.backdropPath ||
          featuredRecommendation.posterPath,
        "original",
      )
    : null;

  return (
    <div className="relative mt-4 mb-8 mx-4 md:mx-6 rounded-3xl overflow-hidden border border-white/5 bg-zinc-900/50">
      {/* Background with blur */}
      {backdropUrl && (
        <div className="absolute inset-0 z-0">
          <Image
            src={backdropUrl}
            alt="Backdrop"
            fill
            className="object-cover opacity-40 blur-xs scale-105 saturate-150"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-900/70 to-zinc-900/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/90" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="relative">
            {user.image ? (
              <Image
                src={resolveImage(user.image)!}
                alt={firstName}
                width={80}
                height={80}
                className="rounded-full border-2 border-purple-500 shadow-xl shadow-purple-500/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-purple-500 shadow-xl shadow-purple-500/20 flex items-center justify-center text-2xl font-bold text-white">
                {firstName[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-zinc-900 rounded-full p-1.5 border border-white/10">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
          </div>

          <div>
            <p className="text-purple-400 font-medium mb-1 drop-shadow-md">
              {greeting},
            </p>
            <h1
              className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              {firstName}!
            </h1>
            <p className="text-zinc-300 text-sm mt-2 max-w-md text-shadow-sm">
              Ready to discover some amazing films and series today? We've
              prepared some personalized recommendations just for you.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/profile/${user.username}?tab=diary`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-white font-medium text-sm transition-all backdrop-blur-md"
          >
            <Calendar className="h-4 w-4 text-purple-400" />
            Your Diary
          </Link>
          <Link
            href={`/profile/${user.username}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-white font-medium text-sm transition-all backdrop-blur-md"
          >
            <TrendingUp className="h-4 w-4 text-pink-400" />
            Your Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
