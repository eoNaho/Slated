"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ChevronRight,
  Play,
  Star,
  Clock,
  Calendar,
  Lock,
  CheckCircle2,
  Tv,
  Loader2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export interface Episode {
  id: string;
  tmdbId?: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview?: string | null;
  stillPath?: string | null;
  airDate?: string | null;
  runtime?: number | null;
  voteAverage?: number | null;
  userRating?: number | null;
  watched?: boolean;
}

export interface Season {
  id: string;
  tmdbId?: number;
  seasonNumber: number;
  name: string;
  overview?: string | null;
  posterPath?: string | null;
  airDate?: string | null;
  episodeCount: number;
  episodes?: Episode[];
  userRating?: number | null;
  watchedCount?: number;
}

interface SeasonsPanelProps {
  seasons: Season[];
  seriesId: string;
  seriesTitle: string;
  onFetchEpisodes?: (seasonNumber: number) => Promise<Episode[]>;
}

const TMDB_IMAGE = "https://image.tmdb.org/t/p/w300";

function EpisodeCard({
  episode,
  seriesTitle,
}: {
  episode: Episode;
  seriesTitle: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isWatched, setIsWatched] = useState(episode.watched);

  const stillSrc = episode.stillPath
    ? episode.stillPath.startsWith("http")
      ? episode.stillPath
      : `${TMDB_IMAGE}${episode.stillPath}`
    : null;

  const airYear = episode.airDate
    ? new Date(episode.airDate).getFullYear()
    : null;

  return (
    <div
      className={cn(
        "group relative rounded-2xl border transition-all duration-300 overflow-hidden",
        isWatched
          ? "border-white/5 bg-white/[0.01]"
          : "border-white/8 bg-zinc-900/40 hover:border-white/15 hover:bg-zinc-900/60",
      )}
    >
      <div className="flex gap-0 items-stretch">
        {/* Still image */}
        <div className="relative flex-shrink-0 w-44 sm:w-52 bg-zinc-950">
          {stillSrc ? (
            <Image
              src={stillSrc}
              alt={episode.title || `Episode ${episode.episodeNumber}`}
              width={208}
              height={117}
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                isWatched && "opacity-50 grayscale-[30%]",
                "group-hover:scale-105",
              )}
              style={{ aspectRatio: "16/9" }}
            />
          ) : (
            <div
              className="w-full bg-zinc-900 flex items-center justify-center"
              style={{ aspectRatio: "16/9" }}
            >
              <Tv className="h-6 w-6 text-zinc-700" />
            </div>
          )}

          {/* Episode number badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] font-black text-white uppercase tracking-widest">
            E{String(episode.episodeNumber).padStart(2, "0")}
          </div>

          {/* Watched overlay */}
          {isWatched && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <CheckCircle2 className="h-7 w-7 text-emerald-400 drop-shadow-lg" />
            </div>
          )}

          {/* Play button on hover */}
          {!isWatched && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <Play className="h-4 w-4 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <h4
                className={cn(
                  "font-bold text-sm leading-tight",
                  isWatched ? "text-zinc-500" : "text-white",
                )}
              >
                {episode.title}
              </h4>

              {/* Mark watched */}
              <button
                onClick={() => setIsWatched(!isWatched)}
                className={cn(
                  "flex-shrink-0 p-1.5 rounded-lg border transition-all",
                  isWatched
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-white/5 bg-white/[0.03] text-zinc-600 hover:border-white/15 hover:text-zinc-400",
                )}
                title={
                  isWatched ? "Mark as unwatched" : "Mark as watched"
                }
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-zinc-600 flex-wrap">
              {airYear && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" />
                  {airYear}
                </span>
              )}
              {episode.runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {episode.runtime}m
                </span>
              )}
              {episode.voteAverage && episode.voteAverage > 0 && (
                <span className="flex items-center gap-1 text-amber-500/60">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  {episode.voteAverage.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Overview toggle */}
          {episode.overview && (
            <div className="space-y-1.5">
              <p
                className={cn(
                  "text-xs text-zinc-500 leading-relaxed transition-all",
                  expanded ? "" : "line-clamp-2",
                )}
              >
                {episode.overview}
              </p>
              {episode.overview.length > 120 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-zinc-400 transition-colors flex items-center gap-1"
                >
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                  {expanded ? "Less" : "More"}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function SeasonHeader({
  season,
  isOpen,
  onToggle,
}: {
  season: Season;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const posterSrc = season.posterPath
    ? season.posterPath.startsWith("http")
      ? season.posterPath
      : `https://image.tmdb.org/t/p/w154${season.posterPath}`
    : null;

  const watchedPct =
    season.watchedCount != null && season.episodeCount > 0
      ? Math.round((season.watchedCount / season.episodeCount) * 100)
      : 0;

  const airYear = season.airDate
    ? new Date(season.airDate).getFullYear()
    : null;

  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left group",
        isOpen
          ? "border-indigo-500/30 bg-indigo-500/5"
          : "border-white/5 bg-zinc-900/30 hover:border-white/10 hover:bg-zinc-900/50",
      )}
    >
      {/* Season poster */}
      <div className="relative w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-900 border border-white/5">
        {posterSrc ? (
          <Image
            src={posterSrc}
            alt={season.name || `Season ${season.seasonNumber}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="h-5 w-5 text-zinc-700" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-bold text-sm",
              isOpen ? "text-indigo-300" : "text-white",
            )}
          >
            {season.name}
          </span>
          {airYear && (
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
              {airYear}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
            {season.episodeCount} episodes
          </span>
          {watchedPct > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500/60 transition-all"
                  style={{ width: `${watchedPct}%` }}
                />
              </div>
              <span className="text-[9px] font-black text-zinc-600">
                {watchedPct}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight
        className={cn(
          "h-4 w-4 flex-shrink-0 transition-transform duration-300",
          isOpen ? "rotate-90 text-indigo-400" : "text-zinc-600",
        )}
      />
    </button>
  );
}

// Import Layers icon (it's used in SeasonHeader)
function Layers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

export function SeasonsPanel({
  seasons,
  seriesId,
  seriesTitle,
  onFetchEpisodes,
}: SeasonsPanelProps) {
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set([1]));
  const [loadingSeasons, setLoadingSeasons] = useState<Set<number>>(new Set());
  const [loadedEpisodes, setLoadedEpisodes] = useState<
    Record<number, Episode[]>
  >({});

  const toggleSeason = useCallback(
    async (seasonNumber: number) => {
      const isOpen = openSeasons.has(seasonNumber);

      if (isOpen) {
        setOpenSeasons((prev) => {
          const next = new Set(prev);
          next.delete(seasonNumber);
          return next;
        });
        return;
      }

      setOpenSeasons((prev) => new Set([...prev, seasonNumber]));

      // Fetch episodes if not loaded yet
      if (!loadedEpisodes[seasonNumber]) {
        setLoadingSeasons((prev) => new Set([...prev, seasonNumber]));
        try {
          let fetched: Episode[] = [];
          if (onFetchEpisodes) {
            fetched = await onFetchEpisodes(seasonNumber);
          } else {
            const res = await api.series.getSeasonDetails(seriesId, seasonNumber);
            if (res.data?.episodes) {
              fetched = res.data.episodes;
            }
          }
          setLoadedEpisodes((prev) => ({ ...prev, [seasonNumber]: fetched }));
        } catch (err) {
          console.error("Failed to load episodes for season", seasonNumber, err);
        } finally {
          setLoadingSeasons((prev) => {
            const next = new Set(prev);
            next.delete(seasonNumber);
            return next;
          });
        }
      }
    },
    [openSeasons, loadedEpisodes, onFetchEpisodes, seriesId],
  );

  const getEpisodes = (season: Season): Episode[] => {
    return loadedEpisodes[season.seasonNumber] || season.episodes || [];
  };

  return (
    <div className="space-y-3">
      {seasons.map((season) => {
        const isOpen = openSeasons.has(season.seasonNumber);
        const isLoading = loadingSeasons.has(season.seasonNumber);
        const episodes = getEpisodes(season);

        return (
          <div key={season.id} className="space-y-2">
            <SeasonHeader
              season={season}
              isOpen={isOpen}
              onToggle={() => toggleSeason(season.seasonNumber)}
            />

            {/* Episodes list */}
            {isOpen && (
              <div className="pl-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                  </div>
                ) : episodes.length > 0 ? (
                  episodes.map((episode) => (
                    <EpisodeCard
                      key={episode.id}
                      episode={episode}
                      seriesTitle={seriesTitle}
                    />
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <Lock className="h-8 w-8 text-zinc-800 mx-auto mb-3" />
                    <p className="text-zinc-600 text-sm">
                      Episodes not yet available
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
