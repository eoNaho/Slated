"use client";

import { Calendar, Star, Info } from "lucide-react";

interface ScrobbleItem {
  id: string;
  title: string;
  season?: number;
  episode?: number;
  source: string;
  rating?: number;
  watchedAt: string;
}

interface ScrobblesHistoryProps {
  scrobbles?: ScrobbleItem[];
}

export function ScrobblesHistory({ scrobbles }: ScrobblesHistoryProps) {
  const data = scrobbles || [
    {
      id: "1",
      title: "Alien: Romulus",
      source: "Netflix",
      rating: 4,
      watchedAt: "28/10/2025",
    },
    {
      id: "2",
      title: "The Bear",
      season: 3,
      episode: 5,
      source: "Prime",
      watchedAt: "27/10/2025",
    },
    {
      id: "3",
      title: "The Bear",
      season: 3,
      episode: 4,
      source: "Prime",
      watchedAt: "27/10/2025",
    },
    {
      id: "4",
      title: "Conclave",
      source: "Cinema",
      rating: 5,
      watchedAt: "25/10/2025",
    },
    {
      id: "5",
      title: "The Bear",
      season: 3,
      episode: 3,
      source: "Prime",
      watchedAt: "22/10/2025",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-400" />
          Scrobble History
        </h3>
        <span className="text-xs text-zinc-500 font-medium lowercase">October 2025</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-white/5">
              <th className="pb-3 pr-4 font-bold">Date</th>
              <th className="pb-3 pr-4 font-bold">Title</th>
              <th className="pb-3 pr-4 font-bold">Source</th>
              <th className="pb-3 text-right font-bold">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((item) => (
              <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="py-4 pr-4">
                  <span className="text-xs font-medium text-zinc-400 whitespace-nowrap">
                    {item.watchedAt.split("/").slice(0, 2).join("/")}
                  </span>
                </td>
                <td className="py-4 pr-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors truncate max-w-[200px] md:max-w-md">
                      {item.title}
                    </span>
                    {item.season && (
                      <span className="text-[10px] text-zinc-500">
                        S{item.season.toString().padStart(2, "0")}E{item.episode?.toString().padStart(2, "0")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 pr-4">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/5 font-medium">
                    {item.source}
                  </span>
                </td>
                <td className="py-4 text-right">
                  {item.rating ? (
                    <div className="flex items-center justify-end gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < (item.rating || 0)
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-zinc-800 fill-zinc-800"
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-700">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex gap-3 items-start">
        <Info className="h-4 w-4 text-purple-400 mt-0.5" />
        <p className="text-xs text-zinc-400 leading-relaxed">
          Scrobbles are recorded automatically when you finish watching something via the extension, or manually through the individual movie/episode page.
        </p>
      </div>
    </div>
  );
}
