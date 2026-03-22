"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Heart, Share2, Eye, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogModal } from "@/components/media";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useMediaState } from "@/hooks/queries/use-media-state";

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
  const [uploadingCover, setUploadingCover] = useState(false);

  // Derive display values from server state; local overrides for optimistic UI
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [optimisticWatchlist, setOptimisticWatchlist] = useState<boolean | null>(null);
  const [optimisticWatched, setOptimisticWatched] = useState<boolean | null>(null);

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

  const handleCustomCover = async (file: File) => {
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("cover", file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"}/media/${movie.id}/custom-cover`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.error?.includes("Pro") || err.error?.includes("Ultra")) {
          toast.error("Capas customizadas requerem plano Pro ou Ultra");
        } else {
          toast.error("Erro ao enviar capa");
        }
      } else {
        toast.success("Capa personalizada salva!");
      }
    } catch {
      toast.error("Erro ao enviar capa");
    } finally {
      setUploadingCover(false);
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
          onClick={handleShare}
          className="flex-1 text-zinc-400 hover:bg-white/5"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
        <label
          title="Trocar capa personalizada"
          className={`cursor-pointer h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-800/60 border border-white/10 hover:bg-zinc-700 transition-all text-zinc-400 hover:text-white ${uploadingCover ? "opacity-50 pointer-events-none" : ""}`}
        >
          {uploadingCover ? (
            <div className="h-4 w-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCustomCover(file);
            }}
          />
        </label>
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
