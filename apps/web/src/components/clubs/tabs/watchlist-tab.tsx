"use client";

import { useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import {
  Bookmark,
  Film,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import type { ClubWatchlistItem } from "@/lib/queries/clubs";
import type { SearchResult } from "@/types";
import { MediaSearchInput } from "@/components/media/media-search-input";
import {
  apiFetch,
  inputCls,
  btnPrimaryCls,
  btnGhostCls,
  EmptyState,
} from "../shared/club-ui";

interface WatchlistTabProps {
  clubId: string;
  isMember: boolean;
  isAdmin: boolean;
  sessionUserId?: string | null;
  initialWatchlist: ClubWatchlistItem[];
}

export function WatchlistTab({
  clubId,
  isMember,
  isAdmin,
  sessionUserId,
  initialWatchlist,
}: WatchlistTabProps) {
  const [watchlist, setWatchlist] = useState<ClubWatchlistItem[]>(initialWatchlist);
  const [showForm, setShowForm] = useState(false);
  const [media, setMedia] = useState<Pick<
    SearchResult,
    "id" | "title" | "posterPath" | "mediaType" | "localId"
  > | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!media) {
      toast.error("Select a movie or series.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch(`/clubs/${clubId}/watchlist`, {
        method: "POST",
        body: JSON.stringify({
          mediaId: media.localId || undefined,
          mediaTitle: media.title,
          mediaPosterPath: media.posterPath,
          mediaType: media.mediaType,
          note: note || undefined,
        }),
      });
      setWatchlist((prev) => [...prev, data.data]);
      setMedia(null);
      setNote("");
      setShowForm(false);
      toast.success("Added to watchlist!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleWatched(itemId: string, isWatched: boolean) {
    try {
      await apiFetch(`/clubs/${clubId}/watchlist/${itemId}/watched`, {
        method: "PATCH",
        body: JSON.stringify({ isWatched }),
      });
      setWatchlist((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, isWatched } : i)),
      );
      toast.success(isWatched ? "Marked as watched!" : "Unmarked.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleRemove(itemId: string) {
    try {
      await apiFetch(`/clubs/${clubId}/watchlist/${itemId}`, {
        method: "DELETE",
      });
      setWatchlist((prev) => prev.filter((i) => i.id !== itemId));
      toast.success("Removed from watchlist.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  }

  return (
    <div className="max-w-2xl">
      {isMember && (
        <div className="mb-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="group relative flex items-center gap-4 w-full text-left px-6 py-5 rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all text-sm font-medium overflow-hidden backdrop-blur-md"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 border border-purple-500/20 transition-all">
                <Plus className="h-5 w-5 text-purple-400" />
              </div>
              <span className="relative z-10 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                Suggest a title for the watchlist...
              </span>
            </button>
          ) : (
            <div
              className="rounded-xl border border-white/8 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                <span className="text-sm font-semibold text-zinc-400">
                  Add to Watchlist
                </span>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-zinc-600 hover:text-zinc-400 p-0.5 rounded-md hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="p-5 space-y-3">
                <MediaSearchInput
                  value={media}
                  onChange={setMedia}
                  placeholder="Search movie or series..."
                />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note (optional)"
                  className={inputCls}
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className={btnPrimaryCls}
                    style={{
                      background:
                        "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                    }}
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className={btnGhostCls}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {watchlist.length === 0 ? (
        <EmptyState icon={Bookmark} text="No titles in the watchlist yet." />
      ) : (
        <div className="space-y-2">
          {[...watchlist]
            .sort((a, b) => Number(a.isWatched) - Number(b.isWatched))
            .map((item) => {
              const canToggleWatched = isAdmin;
              const canRemove = isAdmin || item.suggestedBy === sessionUserId;
              return (
                <div
                  key={item.id}
                  className="group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 overflow-hidden hover:scale-[1.01]"
                  style={{
                    borderColor: item.isWatched
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(168,85,247,0.15)",
                    background: item.isWatched
                      ? "rgba(255,255,255,0.01)"
                      : "rgba(24,24,27,0.4)",
                    backdropFilter: "blur(20px)",
                    opacity: item.isWatched ? 0.6 : 1,
                    boxShadow: item.isWatched
                      ? "none"
                      : "0 8px 32px -8px rgba(0,0,0,0.5)",
                  }}
                >
                  {!item.isWatched && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  )}
                  <div
                    className="absolute inset-0 opacity-[0.02] pointer-events-none"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
                    }}
                  />
                  <div
                    className="relative z-10 w-9 h-14 shrink-0 rounded-lg overflow-hidden border border-white/5"
                    style={{ background: "#111" }}
                  >
                    {item.mediaPosterPath ? (
                      <Image
                        fill
                        src={item.mediaPosterPath}
                        alt={item.mediaTitle}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="h-4 w-4 text-zinc-700" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white line-clamp-1">
                        {item.mediaTitle}
                      </span>
                      {item.isWatched && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md border border-white/5 bg-zinc-950 text-purple-400">
                        {item.mediaType === "movie" ? "Movie" : "Series"}
                      </span>
                      {item.note && (
                        <span className="text-xs text-zinc-600 line-clamp-1">
                          {item.note}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                    {canToggleWatched && (
                      <button
                        onClick={() =>
                          handleToggleWatched(item.id, !item.isWatched)
                        }
                        className={`p-1.5 rounded-lg transition-all ${
                          item.isWatched
                            ? "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                            : "text-emerald-400 hover:bg-emerald-950/30"
                        }`}
                        title={
                          item.isWatched
                            ? "Unmark as watched"
                            : "Mark as watched"
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-950/20 transition-all"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
