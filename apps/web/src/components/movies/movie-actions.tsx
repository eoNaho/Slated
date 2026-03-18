"use client";

import { useState } from "react";
import { BookOpen, Plus, Heart, Share2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogModal } from "@/components/media";
import { toast } from "sonner";
interface MovieActionsProps {
  movie: {
    id: string;
    title: string;
    posterPath?: string | null;
    releaseDate?: string | null;
  };
}

export function MovieActions({ movie }: MovieActionsProps) {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watched, setWatched] = useState(false);

  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : undefined;

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
          onClick={() => setWatched(!watched)}
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
          onClick={() => setInWatchlist(!inWatchlist)}
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
          onClick={() => setLiked(!liked)}
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
        onSubmit={(data) => {
          console.log("Log submitted:", data);
          // TODO: Send to API
          setWatched(true);
        }}
      />
    </>
  );
}
