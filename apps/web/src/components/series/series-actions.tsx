"use client";

import { useState, useEffect } from "react";
import { BookOpen, Plus, Heart, Share2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogModal } from "@/components/media";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface SeriesActionsProps {
  series: {
    id: string;
    title: string;
    posterPath?: string | null;
    releaseDate?: string | null;
  };
}

export function SeriesActions({ series }: SeriesActionsProps) {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watched, setWatched] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api.media.getState(series.id)
      .then((res) => {
        if (mounted && res.data) {
          setLiked(res.data.liked);
          setWatched(res.data.watched);
          setInWatchlist(res.data.inWatchlist);
          setRating(res.data.rating);
          setReview(res.data.review);
        }
      })
      .catch((err) => console.error("Failed to load user state", err));
    return () => { mounted = false; };
  }, [series.id]);

  const toggleLiked = async () => {
    const prev = liked;
    setLiked(!prev);
    try {
      if (prev) await api.likes.unlike("media", series.id);
      else await api.likes.like("media", series.id);
    } catch {
      setLiked(prev);
      toast.error("Failed to update like status");
    }
  };

  const toggleWatchlist = async () => {
    const prev = inWatchlist;
    setInWatchlist(!prev);
    try {
      if (prev) await api.watchlist.remove(series.id);
      else await api.watchlist.add(series.id);
    } catch {
      setInWatchlist(prev);
      toast.error("Failed to update watchlist");
    }
  };

  const toggleWatched = async () => {
    if (watched) {
      toast.info("Already marked as watched. Edit from your diary if needed.");
      return;
    }
    setWatched(true);
    try {
      await api.diary.add(series.id, { isRewatch: false });
      toast.success("Marked as watched!");
    } catch {
      setWatched(false);
      toast.error("Failed to mark as watched");
    }
  };

  const year = series.releaseDate
    ? new Date(series.releaseDate).getFullYear()
    : undefined;

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${series.title} - PixelReel`;

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
      <div className="space-y-2">
        <Button
          onClick={() => setIsLogModalOpen(true)}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 justify-start"
          size="lg"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Log or Review
        </Button>

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
      </div>

      <LogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        media={{
          id: series.id,
          title: series.title,
          posterPath: series.posterPath || undefined,
          year,
          type: "series",
        }}
        onSubmit={async (data) => {
          try {
            await api.diary.add(series.id, {
              rating: data.rating,
              notes: data.review,
              isRewatch: data.isRewatch,
            });
            toast.success("Logged successfully!");
            setWatched(true);
            setRating(data.rating);
            setReview(data.review);
          } catch (err) {
            console.error("Failed to log:", err);
            toast.error("Failed to log media");
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
