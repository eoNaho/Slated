"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Review {
  id: number;
  user: {
    name: string;
    avatar: string;
  };
  movieTitle: string;
  rating: number;
  content: string;
  likes: number;
  comments: number;
  poster: string;
}

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [bookmarked, setBookmarked] = useState(false);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = bookmarked;
    setBookmarked(!prev);
    try {
      if (prev) await api.bookmarks.unbookmark("review", String(review.id));
      else await api.bookmarks.bookmark("review", String(review.id));
    } catch {
      setBookmarked(prev);
      toast.error("Failed to save review");
    }
  };

  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-lg transition-all group cursor-pointer h-full focus-within:ring-1 focus-within:ring-purple-500">
      <div className="flex gap-4">
        <div className="relative flex-shrink-0 w-16 h-24 rounded-md overflow-hidden bg-zinc-800 shadow-lg">
          <Image
            fill
            src={review.poster}
            alt={`Poster of ${review.movieTitle}`}
            className="object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-zinc-100 text-lg group-hover:text-purple-400 transition-colors">
                {review.movieTitle}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/10">
                  <Image fill src={review.user.avatar} alt="" className="object-cover" />
                </div>
                <span className="text-xs text-zinc-400">
                  Review by{" "}
                  <span className="text-zinc-200 font-medium">
                    {review.user.name}
                  </span>
                </span>
              </div>
            </div>
            <div
              className="flex bg-zinc-950/50 px-2 py-1 rounded-md border border-white/5 h-fit"
              aria-label={`Rated ${review.rating} out of 5 stars`}
            >
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < review.rating ? "fill-green-500 text-green-500" : "text-zinc-700 fill-zinc-700"}`}
                />
              ))}
            </div>
          </div>

          <p className="mt-3 text-zinc-400 text-sm leading-relaxed line-clamp-2 group-hover:text-zinc-300 transition-colors">
            "{review.content}"
          </p>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
            <button
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors group/btn focus:text-red-400 focus:outline-none"
              aria-label="Like review"
            >
              <Heart className="h-3.5 w-3.5 group-hover/btn:fill-current" />{" "}
              {review.likes}
            </button>
            <button
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-400 transition-colors focus:text-blue-400 focus:outline-none"
              aria-label="Comment on review"
            >
              <MessageCircle className="h-3.5 w-3.5" /> {review.comments}
            </button>
            <div className="flex-1" />
            <button
              onClick={toggleBookmark}
              className={`transition-colors focus:outline-none ${bookmarked ? "text-yellow-400" : "text-zinc-600 hover:text-yellow-400"}`}
              aria-label={bookmarked ? "Remove from saved" : "Save review"}
            >
              <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-current" : ""}`} />
            </button>
            <button
              className="text-zinc-600 hover:text-white transition-colors focus:text-white focus:outline-none"
              aria-label="Share review"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Review };
