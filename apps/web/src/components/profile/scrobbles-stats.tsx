"use client";

import { Film, Tv, Clock, Award, BarChart3 } from "lucide-react";

import { useEffect, useState } from "react";
import type { ActivityStats } from "@/types";

interface ScrobblesStatsProps {
  userId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export function ScrobblesStats({ userId }: ScrobblesStatsProps) {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/activity/stats/${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setStats(json.data);
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/5 bg-zinc-900/20 backdrop-blur-sm p-6 overflow-hidden relative min-h-[250px] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Use current month if no monthly data exists
  const now = new Date();
  const currentMonthly = stats?.monthly?.find(
    (m) => m.year === now.getFullYear() && m.month === now.getMonth() + 1
  );

  const monthName = currentMonthly 
    ? new Date(currentMonthly.year, currentMonthly.month - 1).toLocaleString('en-US', { month: 'long' })
    : now.toLocaleString('en-US', { month: 'long' });
  
  const year = currentMonthly?.year || now.getFullYear();

  // Find top source
  const topSource = stats?.sourceBreakdown?.length 
    ? stats.sourceBreakdown.reduce((prev, current) => (prev.count > current.count) ? prev : current)
    : { source: "None", count: 0 };

  return (
    <div className="rounded-3xl border border-white/5 bg-zinc-900/20 backdrop-blur-sm p-6 overflow-hidden relative">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl -z-10" />
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-white">Monthly Insights</h3>
          <p className="text-sm text-zinc-500">{monthName} {year}</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
          <BarChart3 className="h-5 w-5 text-purple-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Count Stats */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Film className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Movies</p>
              <p className="text-lg font-bold text-white">{stats?.totalMovies || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Tv className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Episodes</p>
              <p className="text-lg font-bold text-white">{stats?.totalEpisodes || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Clock className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Time Spent</p>
              <p className="text-lg font-bold text-white">{stats?.totalHours || 0}h</p>
            </div>
          </div>
        </div>

        {/* Favorite Stats */}
        <div className="md:col-span-2 space-y-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
                <Award className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Top Source</p>
                <p className="text-base font-bold text-white group-hover:text-purple-300 transition-colors capitalize">{topSource.source}</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                <Film className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Total Scrobbles</p>
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">{stats?.totalScrobbles || 0}</p>
                  <span className="text-xs font-medium text-zinc-500">All time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
