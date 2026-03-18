"use client";

import { Play, Tv, Clock } from "lucide-react";

interface WatchingNowProps {
  item?: {
    title: string;
    season?: number;
    episode?: number;
    progress: number;
    source: string;
    timestamp: string;
  };
}

export function WatchingNow({ item }: WatchingNowProps) {
  // Use mock data if no item provided
  const data = item || {
    title: "Breaking Bad",
    season: 3,
    episode: 4,
    progress: 42.5,
    source: "netflix",
    timestamp: "12 minutes ago",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-md p-4 transition-all hover:bg-zinc-900/60 lg:w-80">
      {/* Background Glow */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl transition-all group-hover:bg-purple-500/20" />
      
      <div className="flex items-start gap-4">
        {/* Play Icon Box */}
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <Play className="h-5 w-5 fill-purple-500 text-purple-500" />
          </div>
          {/* Pulsing indicator */}
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-purple-400">
              Watching Now
            </span>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className="text-[10px] text-zinc-500 font-medium lowercase">
              on {data.source}
            </span>
          </div>
          
          <h4 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
            {data.title}
          </h4>
          
          {data.season && (
            <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5">
              <Tv className="h-3 w-3 text-zinc-600" />
              Season {data.season} · Episode {data.episode}
            </p>
          )}

          <div className="mt-3 space-y-2">
            {/* Progress Bar */}
            <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-1000"
                style={{ width: `${data.progress}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-[10px] font-medium text-zinc-500">
              <span className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {data.timestamp}
              </span>
              <span>{Math.round(data.progress)}% viewed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
