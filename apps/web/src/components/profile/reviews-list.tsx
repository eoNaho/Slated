import Link from "next/link";
import { Star, Heart, MessageCircle, ChevronRight } from "lucide-react";
import { RatingStars } from "./rating-stars";
import type { Review } from "@/types";
import { getMediaUrl } from "@/lib/utils";

interface ReviewsListProps {
  reviews: Review[];
  limit?: number;
  showViewAll?: boolean;
}

export function ReviewsList({
  reviews,
  limit,
  showViewAll = true,
}: ReviewsListProps) {
  const displayReviews = limit ? reviews.slice(0, limit) : reviews;

  return (
    <section>
      {showViewAll && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Star className="h-5 w-5 text-purple-400" />
            Recent Reviews
          </h2>
          <Link
            href="#"
            className="text-sm font-medium text-zinc-500 hover:text-white transition-colors flex items-center gap-1 group"
          >
            View all
            <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-white transition-colors" />
          </Link>
        </div>
      )}
      <div className="space-y-6">
        {displayReviews.map((review) => (
          <div
            key={review.id}
            className="group relative rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/5 hover:border-zinc-700 transition-all duration-300 overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row">
              {/* Poster Column */}
              {review.media && (
                <div className="sm:w-32 md:w-40 shrink-0 relative">
                  <Link
                    href={getMediaUrl(review.media)}
                    className="block aspect-[2/3] sm:h-full w-full relative"
                  >
                    <img
                      src={review.media.posterPath || ""}
                      alt={review.media.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 sm:bg-gradient-to-r sm:from-transparent sm:to-zinc-900/90" />
                  </Link>
                </div>
              )}

              {/* Content Column */}
              <div className="flex-1 p-6 relative">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    {review.media && (
                      <Link
                        href={getMediaUrl(review.media)}
                        className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors"
                      >
                        {review.media.title}{" "}
                        <span className="text-zinc-500 font-normal text-base ml-1">
                          {review.media.year}
                        </span>
                      </Link>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {review.rating && (
                        <RatingStars rating={review.rating} size="sm" />
                      )}
                    </div>
                  </div>
                  <span className="text-zinc-500 text-xs font-medium uppercase tracking-wide">
                    {new Date(review.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <p className="text-zinc-300 text-sm leading-relaxed mb-4 line-clamp-3">
                  "{review.content}"
                </p>

                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                  <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
                    <button className="flex items-center gap-1.5 hover:text-red-400 transition-colors">
                      <Heart className="h-3.5 w-3.5" /> {review.likesCount}
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                      <MessageCircle className="h-3.5 w-3.5" />{" "}
                      {review.commentsCount}
                    </button>
                  </div>
                  {review.containsSpoilers && (
                    <span className="text-[10px] text-orange-500 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                      Spoilers
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
