"use client";

import { Lock, Sparkles } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { useTasteProfile } from "@/hooks/queries/use-recommendations";

interface TasteProfileChartProps {
  isPremium: boolean;
}

const GENRE_COLORS = [
  "#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16",
];

export function TasteProfileChart({ isPremium }: TasteProfileChartProps) {
  const { data, isLoading } = useTasteProfile(isPremium);

  if (!isPremium) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-purple-600/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Premium Feature</h3>
        <p className="text-zinc-400 text-sm max-w-sm">
          View your detailed taste profile with genre analysis, decade preferences, and rating patterns.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const radarData = (data.topGenres ?? []).slice(0, 8).map((g) => ({
    genre: g.name,
    score: Math.round(g.score * 100),
  }));

  const decadeData = (data.topDecades ?? []).map((d) => ({
    decade: d.decade + "s",
    count: d.count,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <h2 className="text-lg font-bold text-zinc-200">Your Taste Profile</h2>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total watched" value={String(data.totalWatched ?? 0)} />
        <StatCard label="Avg. rating" value={(data.averageRating ?? 0).toFixed(1)} />
        <StatCard
          label="Diversity"
          value={`${Math.round((data.diversityScore ?? 0) * 100)}%`}
          description="Genre variety"
        />
        <StatCard
          label="Mainstream"
          value={`${Math.round((data.mainstreamScore ?? 0) * 100)}%`}
          description="Average popularity"
        />
      </div>

      {/* Genre radar */}
      {radarData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wide">
            Genre Distribution
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis
                  dataKey="genre"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                />
                <Radar
                  name="Gênero"
                  dataKey="score"
                  stroke="#a855f7"
                  fill="#a855f7"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Decade bar chart */}
      {decadeData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wide">
            Films by Decade
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={decadeData} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
                <XAxis dataKey="decade" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                  labelStyle={{ color: "#e4e4e7" }}
                  itemStyle={{ color: "#a855f7" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {decadeData.map((_, i) => (
                    <Cell key={i} fill={GENRE_COLORS[i % GENRE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      {description && <p className="text-xs text-zinc-600 mt-0.5">{description}</p>}
    </div>
  );
}
