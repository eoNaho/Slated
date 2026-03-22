"use client";

import { useState, useEffect } from "react";
import { Trophy, Check, Lock, Filter } from "lucide-react";
import { gamificationApi } from "@/lib/api";
import type { Achievement } from "@/types";

const RARITY_COLORS: Record<string, string> = {
  common: "bg-zinc-700 text-zinc-300 border-zinc-600",
  uncommon: "bg-green-900/40 text-green-400 border-green-700/50",
  rare: "bg-blue-900/40 text-blue-400 border-blue-700/50",
  epic: "bg-purple-900/40 text-purple-400 border-purple-700/50",
  legendary: "bg-yellow-900/40 text-yellow-400 border-yellow-700/50",
};

const CATEGORY_LABELS: Record<string, string> = {
  watching: "Watching",
  social: "Social",
  critic: "Critic",
  explorer: "Explorer",
  collector: "Collector",
  special: "Special",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);

  useEffect(() => {
    gamificationApi.getAchievements().then((res) => {
      setAchievements(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = achievements.filter((a) => {
    if (activeCategory !== "all" && a.category !== activeCategory) return false;
    if (showUnlockedOnly && !a.isUnlocked) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, Achievement[]>>((acc, a) => {
    const cat = a.category || "special";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Header */}
      <div className="border-b border-white/5 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <h1 className="text-2xl font-bold">Achievements</h1>
              </div>
              <p className="text-zinc-500 text-sm">
                Complete challenges to earn XP and unlock exclusive titles and frames.
              </p>
            </div>
            {!loading && (
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-white">{unlockedCount}</div>
                <div className="text-xs text-zinc-500">/ {achievements.length} unlocked</div>
                <div className="mt-1.5 h-1.5 w-32 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full transition-all"
                    style={{ width: `${achievements.length ? (unlockedCount / achievements.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap mb-8">
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/5 rounded-xl p-1">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              All
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowUnlockedOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              showUnlockedOnly
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                : "bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Filter className="h-3 w-3" />
            Unlocked only
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-zinc-900/50 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Trophy className="h-10 w-10 text-zinc-700 mb-3" />
            <p className="text-zinc-500 font-medium">No achievements found</p>
          </div>
        ) : (
          <div className="space-y-10">
            {(activeCategory === "all" ? ALL_CATEGORIES : [activeCategory])
              .filter((cat) => grouped[cat]?.length > 0)
              .map((cat) => (
                <div key={cat}>
                  <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
                    {CATEGORY_LABELS[cat]}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {grouped[cat].map((a) => (
                      <AchievementCard key={a.id} achievement={a} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AchievementCard({ achievement: a }: { achievement: Achievement }) {
  const isSecret = a.isSecret && !a.isUnlocked;
  const rarityClass = RARITY_COLORS[a.rarity || "common"] || RARITY_COLORS.common;

  return (
    <div
      className={`relative p-4 rounded-xl border transition-all ${
        a.isUnlocked
          ? "bg-zinc-900 border-white/10"
          : "bg-zinc-900/40 border-white/5 opacity-70"
      }`}
    >
      {/* Unlocked badge */}
      {a.isUnlocked && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
          <Check className="h-3 w-3 text-green-400" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
            a.isUnlocked ? "bg-zinc-800" : "bg-zinc-800/50 grayscale"
          }`}
        >
          {isSecret ? "🔒" : (a.icon || "🏆")}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-sm font-bold text-white truncate">
              {isSecret ? "Secret Achievement" : a.name}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
            {isSecret ? "Keep watching and exploring to unlock this." : (a.description || "")}
          </p>

          {/* Progress bar */}
          {!a.isUnlocked && !isSecret && (a.progress ?? 0) > 0 && (
            <div className="mt-2">
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${a.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-600 mt-0.5">{a.progress}%</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize ${rarityClass}`}>
              {a.rarity || "common"}
            </span>
            <span className="text-[10px] text-zinc-600 font-medium">+{a.xpReward} XP</span>
            {a.isUnlocked && a.unlockedAt && (
              <span className="text-[10px] text-zinc-600 ml-auto">
                {new Date(a.unlockedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
      </div>

      {!a.isUnlocked && !isSecret && (
        <Lock className="absolute bottom-3 right-3 h-3 w-3 text-zinc-700" />
      )}
    </div>
  );
}
