"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { gamificationApi } from "@/lib/api";
import { resolveImage } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types";

const RANK_STYLES: Record<number, { bg: string; text: string; icon: React.ReactNode }> = {
  1: {
    bg: "bg-yellow-500/10 border-yellow-500/30",
    text: "text-yellow-400",
    icon: <Trophy className="h-4 w-4 text-yellow-400" />,
  },
  2: {
    bg: "bg-zinc-400/10 border-zinc-400/30",
    text: "text-zinc-300",
    icon: <Medal className="h-4 w-4 text-zinc-400" />,
  },
  3: {
    bg: "bg-amber-700/10 border-amber-700/30",
    text: "text-amber-600",
    icon: <Medal className="h-4 w-4 text-amber-600" />,
  },
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gamificationApi.getLeaderboard(50).then((res) => {
      setEntries(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Header */}
      <div className="border-b border-white/5 bg-zinc-900/50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h1 className="text-2xl font-bold">Leaderboard</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            Top users ranked by XP earned through watching, reviewing, and engaging.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-zinc-900/50 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Trophy className="h-10 w-10 text-zinc-700 mb-3" />
            <p className="text-zinc-500 font-medium">No rankings yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const rank = index + 1;
              const rankStyle = RANK_STYLES[rank];
              return (
                <Link
                  key={entry.userId}
                  href={`/profile/${entry.username}`}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors hover:bg-white/[0.03] ${
                    rankStyle
                      ? `${rankStyle.bg} hover:border-current`
                      : "bg-zinc-900/30 border-white/5"
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-8 text-center shrink-0 ${rankStyle ? rankStyle.text : "text-zinc-500"}`}>
                    {rankStyle ? rankStyle.icon : (
                      <span className="text-sm font-bold">{rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                    {entry.avatarUrl ? (
                      <Image
                        src={resolveImage(entry.avatarUrl, "w92") || ""}
                        alt={entry.displayName || entry.username}
                        width={36}
                        height={36}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                        {(entry.displayName || entry.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {entry.displayName || entry.username}
                    </p>
                    <p className="text-xs text-zinc-500">@{entry.username}</p>
                  </div>

                  {/* Level */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-600/20 border border-violet-500/30 text-[11px] font-bold text-violet-300">
                      {entry.level}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-5 shrink-0 text-right">
                    <div>
                      <div className="text-xs font-bold text-white">{entry.xp.toLocaleString()}</div>
                      <div className="text-[10px] text-zinc-600">XP</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{entry.moviesWatched}</div>
                      <div className="text-[10px] text-zinc-600">films</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{entry.reviewsCount}</div>
                      <div className="text-[10px] text-zinc-600">reviews</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
