"use client";

import * as React from "react";
import { X, History, Film, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activityApi } from "@/lib/api";

interface CreateScrobbleModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateScrobbleModal({ onClose, onSuccess }: CreateScrobbleModalProps) {
  const [title, setTitle] = React.useState("");
  const [mediaType, setMediaType] = React.useState<"movie" | "episode">("movie");
  const [season, setSeason] = React.useState("");
  const [episode, setEpisode] = React.useState("");
  const [source, setSource] = React.useState("");
  const [watchedAt, setWatchedAt] = React.useState(
    new Date().toISOString().slice(0, 16)
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await activityApi.createScrobble({
        title: title.trim(),
        media_type: mediaType,
        season: season ? Number(season) : undefined,
        episode: episode ? Number(episode) : undefined,
        source: source.trim() || undefined,
        watched_at: watchedAt ? new Date(watchedAt).toISOString() : undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to log scrobble");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-purple-400" />
            <h2 className="font-bold text-white text-sm">Log Scrobble</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Movie or series title..."
              required
              className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600"
            />
          </div>

          {/* Media Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMediaType("movie")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  mediaType === "movie"
                    ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
                    : "bg-zinc-800/50 border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                Movie
              </button>
              <button
                type="button"
                onClick={() => setMediaType("episode")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  mediaType === "episode"
                    ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
                    : "bg-zinc-800/50 border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                <Tv className="h-3.5 w-3.5" />
                Episode
              </button>
            </div>
          </div>

          {/* Season/Episode (conditional) */}
          {mediaType === "episode" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Season</label>
                <Input
                  type="number"
                  min="1"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="1"
                  className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Episode</label>
                <Input
                  type="number"
                  min="1"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  placeholder="1"
                  className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
            </div>
          )}

          {/* Source */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Source</label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Netflix, Cinema, Blu-ray..."
              className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600"
            />
          </div>

          {/* Watched at */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Watched at</label>
            <Input
              type="datetime-local"
              value={watchedAt}
              onChange={(e) => setWatchedAt(e.target.value)}
              className="bg-zinc-800/50 border-white/10 text-white"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10 bg-transparent text-zinc-400 hover:text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
            >
              {isSubmitting ? "Logging..." : "Log Scrobble"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
