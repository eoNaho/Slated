"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ChevronLeft,
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
  EyeOff,
  CheckCheck,
  Send,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";

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
  myRating?: number | null;
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
  myRating?: number | null;
  watchedCount?: number;
}

interface SeasonsPanelProps {
  seasons: Season[];
  seriesId: string;
  seriesTitle?: string;
  onFetchEpisodes?: (seasonNumber: number) => Promise<Episode[]>;
}

const TMDB_IMAGE = "https://image.tmdb.org/t/p/w300";
const EPISODES_INITIAL = 10;
const EPISODES_SHOW_MORE_THRESHOLD = 15;

// ── Mini Star Rating ────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  size = "sm",
}: {
  value: number | null;
  onChange?: (rating: number) => void;
  size?: "sm" | "xs";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const displayed = hover ?? value ?? 0;
  const starSize = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(null)}
          disabled={!onChange}
          className={cn(
            "transition-colors",
            onChange ? "cursor-pointer" : "cursor-default",
          )}
        >
          <Star
            className={cn(
              starSize,
              "transition-colors",
              star <= displayed
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-zinc-700",
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ── Episode Card ────────────────────────────────────────────────────────────

function EpisodeCard({
  episode,
  seriesId,
}: {
  episode: Episode;
  seriesId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isWatched, setIsWatched] = useState(episode.watched ?? false);
  const [myRating, setMyRating] = useState<number | null>(episode.myRating ?? null);
  const [isToggling, setIsToggling] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const stillSrc = episode.stillPath
    ? episode.stillPath.startsWith("http")
      ? episode.stillPath
      : `${TMDB_IMAGE}${episode.stillPath}`
    : null;

  const airYear = episode.airDate
    ? new Date(episode.airDate).getFullYear()
    : null;

  const handleToggleWatched = async () => {
    if (isToggling) return;
    setIsToggling(true);
    const prev = isWatched;
    setIsWatched(!prev);
    try {
      if (prev) {
        await api.series.unwatchEpisode(seriesId, episode.id);
        setMyRating(null);
      } else {
        await api.series.watchEpisode(seriesId, episode.id);
      }
    } catch {
      setIsWatched(prev);
      toast.error("Falha ao atualizar episódio");
    } finally {
      setIsToggling(false);
    }
  };

  const handleRating = async (rating: number) => {
    const prev = myRating;
    setMyRating(rating);
    try {
      await api.series.watchEpisode(seriesId, episode.id, { rating });
      if (!isWatched) setIsWatched(true);
    } catch {
      setMyRating(prev);
      toast.error("Falha ao salvar avaliação");
    }
  };

  const handleSaveNotes = async () => {
    const content = notes.trim();
    if (!content) return;
    setSavingNotes(true);
    try {
      await api.series.watchEpisode(seriesId, episode.id, {
        rating: myRating ?? undefined,
        notes: content,
      });
      if (!isWatched) setIsWatched(true);
      toast.success("Nota salva!");
      setNotes("");
      setShowNotes(false);
    } catch {
      toast.error("Falha ao salvar nota");
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-2xl border transition-all duration-300 overflow-hidden",
        isWatched
          ? "border-white/5 bg-white/[0.01]"
          : "border-white/[0.08] bg-zinc-900/40 hover:border-white/15 hover:bg-zinc-900/60",
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
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-xs font-semibold text-white">
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
        <div className="flex-1 p-4 min-w-0 flex flex-col gap-2">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                "font-semibold text-sm leading-tight",
                isWatched ? "text-zinc-500" : "text-white",
              )}
            >
              {episode.title}
            </h4>

            {/* Watch toggle */}
            <button
              onClick={handleToggleWatched}
              disabled={isToggling}
              className={cn(
                "flex-shrink-0 p-1.5 rounded-lg border transition-all disabled:opacity-50",
                isWatched
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                  : "border-white/5 bg-white/[0.03] text-zinc-600 hover:border-white/15 hover:text-zinc-400",
              )}
              title={isWatched ? "Marcar como não assistido" : "Marcar como assistido"}
            >
              {isToggling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isWatched ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-zinc-600 flex-wrap">
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

          {/* My rating (shown when watched) */}
          {isWatched && (
            <div className="flex items-center gap-2">
              <StarRating
                value={myRating}
                onChange={handleRating}
                size="xs"
              />
              {myRating && (
                <span className="text-xs text-zinc-600">{myRating}/5</span>
              )}
              <button
                onClick={() => {
                  setShowNotes(!showNotes);
                  if (!showNotes) setTimeout(() => notesRef.current?.focus(), 50);
                }}
                className="ml-auto text-xs text-zinc-700 hover:text-zinc-400 transition-colors flex items-center gap-1"
              >
                <Send className="h-2.5 w-2.5" />
                Nota
              </button>
            </div>
          )}

          {/* Notes input */}
          {showNotes && isWatched && (
            <div className="flex gap-2">
              <textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                placeholder="Escreva uma nota sobre o episódio…"
                rows={2}
                className="flex-1 px-3 py-2 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none bg-white/[0.03] border border-white/[0.06] focus:border-indigo-500/40 transition-colors"
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleSaveNotes}
                  disabled={!notes.trim() || savingNotes}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                >
                  {savingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => setShowNotes(false)}
                  className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-zinc-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Overview toggle */}
          {episode.overview && (
            <div className="space-y-1">
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
                  className="text-xs text-zinc-700 hover:text-zinc-400 transition-colors flex items-center gap-1"
                >
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                  {expanded ? "Menos" : "Mais"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Season Selector (horizontal chip bar) ───────────────────────────────────

function SeasonSelector({
  seasons,
  selected,
  onSelect,
}: {
  seasons: Season[];
  selected: number;
  onSelect: (n: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Scroll shadow left */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
      {/* Scroll shadow right */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-950 to-transparent z-10" />

      {/* Arrow buttons for many seasons */}
      {seasons.length > 8 && (
        <>
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1",
          seasons.length > 8 ? "px-9" : "px-0",
        )}
      >
        {seasons.map((season) => {
          const isSelected = season.seasonNumber === selected;
          const watchedPct =
            season.watchedCount != null && season.episodeCount > 0
              ? Math.round((season.watchedCount / season.episodeCount) * 100)
              : 0;
          const isComplete = watchedPct === 100;

          return (
            <button
              key={season.id}
              onClick={() => onSelect(season.seasonNumber)}
              className={cn(
                "relative flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                isSelected
                  ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                  : "border-white/5 bg-zinc-900/30 text-zinc-500 hover:border-white/10 hover:text-zinc-300 hover:bg-zinc-900/50",
              )}
            >
              <span className="whitespace-nowrap">
                T{season.seasonNumber}
              </span>
              {/* Progress indicator */}
              {isComplete ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              ) : watchedPct > 0 ? (
                <div className="w-8 h-0.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500/60 transition-all"
                    style={{ width: `${watchedPct}%` }}
                  />
                </div>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Season Detail Panel ──────────────────────────────────────────────────────

function SeasonDetail({
  season,
  seriesId,
  episodes,
  isLoading,
  onWatchedCountChange,
}: {
  season: Season;
  seriesId: string;
  episodes: Episode[];
  isLoading: boolean;
  onWatchedCountChange?: (seasonNumber: number, count: number) => void;
}) {
  const [myRating, setMyRating] = useState<number | null>(season.myRating ?? null);
  const [showRateForm, setShowRateForm] = useState(false);
  const [rateNotes, setRateNotes] = useState("");
  const [savingRating, setSavingRating] = useState(false);
  const [watchingAll, setWatchingAll] = useState(false);
  const [showAll, setShowAll] = useState(false);

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

  const handleSaveRating = async (rating: number) => {
    const prev = myRating;
    setMyRating(rating);
    setSavingRating(true);
    try {
      await api.series.rateSeason(seriesId, season.seasonNumber, {
        rating,
        notes: rateNotes.trim() || undefined,
      });
      setShowRateForm(false);
      setRateNotes("");
    } catch {
      setMyRating(prev);
      toast.error("Falha ao salvar avaliação");
    } finally {
      setSavingRating(false);
    }
  };

  const handleWatchAll = async () => {
    setWatchingAll(true);
    try {
      const res = await api.series.watchAllSeason(seriesId, season.seasonNumber);
      onWatchedCountChange?.(season.seasonNumber, res.marked ?? season.episodeCount);
      toast.success(`${res.marked} episódios marcados como assistidos`);
    } catch {
      toast.error("Falha ao marcar temporada");
    } finally {
      setWatchingAll(false);
    }
  };

  const visibleEpisodes =
    !showAll && episodes.length > EPISODES_SHOW_MORE_THRESHOLD
      ? episodes.slice(0, EPISODES_INITIAL)
      : episodes;

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/30 overflow-hidden">
      {/* Season info + actions */}
      <div className="p-4 flex gap-4 items-start border-b border-white/5">
        {/* Poster */}
        {posterSrc && (
          <div className="relative w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-900 border border-white/5">
            <Image
              src={posterSrc}
              alt={season.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h3 className="font-semibold text-white text-sm">{season.name}</h3>
            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
              {airYear && <span>{airYear}</span>}
              <span>{season.episodeCount} episódios</span>
              {watchedPct > 0 && (
                <span className="flex items-center gap-1.5">
                  <div className="w-12 h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500/60 transition-all"
                      style={{ width: `${watchedPct}%` }}
                    />
                  </div>
                  {watchedPct === 100 ? (
                    <span className="flex items-center gap-0.5 text-emerald-500">
                      <Check className="h-3 w-3" /> Completa
                    </span>
                  ) : (
                    <span>{watchedPct}%</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-3 flex-wrap">
            <StarRating
              value={myRating}
              onChange={(r) => {
                setShowRateForm(true);
                handleSaveRating(r);
              }}
              size="xs"
            />
            {myRating && (
              <span className="text-xs text-zinc-600">{myRating}/5</span>
            )}
            <button
              onClick={() => setShowRateForm(!showRateForm)}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
            >
              <Send className="h-2.5 w-2.5" />
              Review
            </button>
            <button
              onClick={handleWatchAll}
              disabled={watchingAll}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.03] border border-white/5 text-zinc-500 hover:text-white hover:border-white/15 transition-all disabled:opacity-50"
            >
              {watchingAll ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3" />
              )}
              Marcar todos
            </button>
          </div>
        </div>
      </div>

      {/* Season review form */}
      {showRateForm && (
        <div className="px-4 py-3 border-b border-white/5 flex gap-2">
          <textarea
            value={rateNotes}
            onChange={(e) => setRateNotes(e.target.value.slice(0, 500))}
            placeholder="Escreva um review da temporada (opcional)…"
            rows={2}
            className="flex-1 px-3 py-2 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none bg-white/[0.03] border border-white/[0.06] focus:border-indigo-500/40 transition-colors"
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={() => myRating && handleSaveRating(myRating)}
              disabled={savingRating || !myRating}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
            >
              {savingRating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            </button>
            <button
              onClick={() => setShowRateForm(false)}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-zinc-500 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Episode list */}
      <div className="p-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
          </div>
        ) : episodes.length === 0 ? (
          <div className="py-8 text-center">
            <Lock className="h-8 w-8 text-zinc-800 mx-auto mb-3" />
            <p className="text-zinc-600 text-sm">Episódios ainda não disponíveis</p>
          </div>
        ) : (
          <>
            {visibleEpisodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                seriesId={seriesId}
              />
            ))}

            {/* Show more / less */}
            {episodes.length > EPISODES_SHOW_MORE_THRESHOLD && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-all flex items-center justify-center gap-2"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    showAll && "rotate-180",
                  )}
                />
                {showAll
                  ? "Mostrar menos"
                  : `Mostrar todos os ${episodes.length} episódios`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Layers icon ─────────────────────────────────────────────────────────────

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

// ── Seasons Panel ───────────────────────────────────────────────────────────

export function SeasonsPanel({
  seasons,
  seriesId,
  onFetchEpisodes,
}: SeasonsPanelProps) {
  const firstSeason = seasons[0]?.seasonNumber ?? 1;
  const [selectedSeason, setSelectedSeason] = useState<number>(firstSeason);
  const [loadingSeasons, setLoadingSeasons] = useState<Set<number>>(new Set());
  const [loadedEpisodes, setLoadedEpisodes] = useState<Record<number, Episode[]>>({});
  const [seasonList, setSeasonList] = useState<Season[]>(seasons);

  const loadSeason = useCallback(
    async (seasonNumber: number) => {
      if (loadedEpisodes[seasonNumber]) return;

      setLoadingSeasons((prev) => new Set([...prev, seasonNumber]));
      try {
        let fetched: Episode[] = [];
        if (onFetchEpisodes) {
          fetched = await onFetchEpisodes(seasonNumber);
        } else {
          const res = await api.series.getSeasonDetails(seriesId, seasonNumber);
          if (res.data?.episodes) {
            fetched = res.data.episodes.map((ep) => ({
              ...ep,
              title: ep.name,
              seasonNumber,
            }));
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
    },
    [loadedEpisodes, onFetchEpisodes, seriesId],
  );

  const handleSelectSeason = useCallback(
    (seasonNumber: number) => {
      setSelectedSeason(seasonNumber);
      loadSeason(seasonNumber);
    },
    [loadSeason],
  );

  // Load the first season on mount
  const hasLoadedFirst = useRef(false);
  if (!hasLoadedFirst.current) {
    hasLoadedFirst.current = true;
    // Load initial season without await (fire-and-forget in render is ok here since it sets state)
    loadSeason(firstSeason);
  }

  const handleWatchedCountChange = (seasonNumber: number, count: number) => {
    setSeasonList((prev) =>
      prev.map((s) =>
        s.seasonNumber === seasonNumber ? { ...s, watchedCount: count } : s,
      ),
    );
    setLoadedEpisodes((prev) => {
      const eps = prev[seasonNumber];
      if (!eps) return prev;
      return { ...prev, [seasonNumber]: eps.map((e) => ({ ...e, watched: true })) };
    });
  };

  const currentSeason = seasonList.find((s) => s.seasonNumber === selectedSeason) ?? seasonList[0];
  const episodes = loadedEpisodes[selectedSeason] ?? currentSeason?.episodes ?? [];
  const isLoading = loadingSeasons.has(selectedSeason);

  if (!currentSeason) return null;

  return (
    <div className="space-y-4">
      {/* Season selector */}
      <SeasonSelector
        seasons={seasonList}
        selected={selectedSeason}
        onSelect={handleSelectSeason}
      />

      {/* Season detail + episodes */}
      <SeasonDetail
        key={selectedSeason}
        season={currentSeason}
        seriesId={seriesId}
        episodes={episodes}
        isLoading={isLoading}
        onWatchedCountChange={handleWatchedCountChange}
      />
    </div>
  );
}
