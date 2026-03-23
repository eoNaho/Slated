"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Heart, Share2, Eye, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogModal } from "@/components/media";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useMediaState } from "@/hooks/queries/use-media-state";
import { ShareToStoryButton } from "@/components/stories/ShareToStoryButton";

interface MovieActionsProps {
  movie: {
    id: string;
    title: string;
    posterPath?: string | null;
    releaseDate?: string | null;
  };
}

export function MovieActions({ movie }: MovieActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: mediaState } = useMediaState(movie.id);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Derive display values from server state; local overrides for optimistic UI
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [optimisticWatchlist, setOptimisticWatchlist] = useState<boolean | null>(null);
  const [optimisticWatched, setOptimisticWatched] = useState<boolean | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  const liked = optimisticLiked ?? mediaState?.liked ?? false;
  const inWatchlist = optimisticWatchlist ?? mediaState?.inWatchlist ?? false;
  const watched = optimisticWatched ?? mediaState?.watched ?? false;
  const rating = mediaState?.rating ?? null;
  const review = mediaState?.review ?? null;

  const invalidateState = () =>
    queryClient.invalidateQueries({ queryKey: ["media", movie.id, "state"] });

  const toggleLiked = async () => {
    const prev = liked;
    setOptimisticLiked(!prev);
    try {
      if (prev) await api.likes.unlike("media", movie.id);
      else await api.likes.like("media", movie.id);
      setOptimisticLiked(null);
      invalidateState();
    } catch {
      setOptimisticLiked(prev);
      toast.error("Failed to update like status");
    }
  };

  const toggleWatchlist = async () => {
    const prev = inWatchlist;
    setOptimisticWatchlist(!prev);
    try {
      if (prev) await api.watchlist.remove(movie.id);
      else await api.watchlist.add(movie.id);
      setOptimisticWatchlist(null);
      invalidateState();
    } catch {
      setOptimisticWatchlist(prev);
      toast.error("Failed to update watchlist");
    }
  };

  const toggleWatched = async () => {
    if (watched) {
      toast.info("Already marked as watched. Edit from your diary if needed.");
      return;
    }
    setOptimisticWatched(true);
    try {
      await api.diary.add(movie.id, { isRewatch: false });
      toast.success("Marked as watched!");
      setOptimisticWatched(null);
      invalidateState();
    } catch {
      setOptimisticWatched(null);
      toast.error("Failed to mark as watched");
    }
  };

  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : undefined;

  const toggleBookmark = async () => {
    const prev = bookmarked;
    setBookmarked(!prev);
    try {
      if (prev) await api.bookmarks.unbookmark("media", movie.id);
      else await api.bookmarks.bookmark("media", movie.id);
    } catch {
      setBookmarked(prev);
      toast.error("Falha ao salvar");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${movie.title} - PixelReel`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      } catch (err) {
        console.error("Error copying to clipboard:", err);
        toast.error("Failed to copy link");
      }
    }
  };

  return (
    <>
      {/* Main Actions */}
      <div className="space-y-2">
        {/* Log Button */}
        <Button
          onClick={() => setIsLogModalOpen(true)}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 justify-start"
          size="lg"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Log or Review
        </Button>

        {/* Watch Button */}
        <Button
          variant="outline"
          onClick={toggleWatched}
          className={`w-full border-white/20 hover:bg-white/5 justify-start ${
            watched
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "text-white"
          }`}
          size="lg"
        >
          <Eye className={`h-4 w-4 mr-2 ${watched ? "fill-green-400" : ""}`} />
          {watched ? "Watched" : "Mark as Watched"}
        </Button>

        {/* Watchlist Button */}
        <Button
          variant="outline"
          onClick={toggleWatchlist}
          className={`w-full border-white/20 hover:bg-white/5 justify-start ${
            inWatchlist
              ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
              : "text-white"
          }`}
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-2 mt-4">
        <Button
          variant="ghost"
          onClick={toggleLiked}
          className={`flex-1 hover:bg-white/5 ${
            liked ? "text-red-400" : "text-zinc-400"
          }`}
        >
          <Heart className={`h-4 w-4 mr-2 ${liked ? "fill-red-400" : ""}`} />
          Like
        </Button>
        <Button
          variant="ghost"
          onClick={toggleBookmark}
          className={`flex-1 hover:bg-white/5 ${
            bookmarked ? "text-yellow-400" : "text-zinc-400"
          }`}
          title={bookmarked ? "Remover dos salvos" : "Salvar"}
        >
          <Bookmark className={`h-4 w-4 mr-2 ${bookmarked ? "fill-yellow-400" : ""}`} />
          Salvar
        </Button>
        <Button
          variant="ghost"
          onClick={handleShare}
          className="flex-1 text-zinc-400 hover:bg-white/5"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
        <ShareToStoryButton
          initialData={{
            type: "watch",
            content: {
              media_id: movie.id,
              media_title: movie.title,
              media_type: "movie",
              poster_path: movie.posterPath ?? undefined,
            },
          }}
          className="flex-1 justify-center h-9 rounded-xl bg-zinc-800/60 border border-white/10 hover:bg-zinc-700 transition-all text-zinc-400 hover:text-white text-xs font-medium"
          label="Story"
        />
      </div>

      {/* Log Modal */}
      <LogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        media={{
          id: movie.id,
          title: movie.title,
          posterPath: movie.posterPath || undefined,
          year,
          type: "movie",
        }}
        onSubmit={async (data) => {
          try {
            await api.diary.add(movie.id, {
              rating: data.rating,
              notes: data.review,
              reviewTitle: data.reviewTitle,
              isRewatch: data.isRewatch,
              watchedAt: data.watchedDate,
              containsSpoilers: data.containsSpoilers,
            });

            // Sync liked state if it changed in the modal
            if (data.liked !== liked) {
              if (data.liked) await api.likes.like("media", movie.id);
              else await api.likes.unlike("media", movie.id);
            }

            setOptimisticWatched(true);
            invalidateState();
            toast.success("Salvo com sucesso!");
            router.refresh();
          } catch (err) {
            console.error("Failed to log:", err);
            toast.error("Erro ao salvar");
          }
        }}
        initialData={{
          rating: rating ?? 0,
          review: review ?? "",
          liked: liked,
          isRewatch: watched,
        }}
      />
    </>
  );
}
