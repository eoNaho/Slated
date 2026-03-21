import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { StarRating } from "@/components/common/star-rating";
import { resolveImage } from "@/lib/utils";
import type { Review } from "@/types";

interface MovieReviewCardProps {
  review: Review;
}

export function MovieReviewCard({ review }: MovieReviewCardProps) {
  return (
    <div
      className="group relative rounded-2xl p-6 border border-white/[0.05] transition-all duration-300 hover:border-white/20 hover:bg-white/[0.02] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
      style={{ 
        background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        backdropFilter: "blur(10px)"
      }}
    >
      <div className="flex items-start gap-5">
        <div className="relative">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-2 ring-white/10 transition-transform group-hover:scale-110 duration-300">
            {review.user?.avatarUrl ? (
              <img
                src={resolveImage(review.user.avatarUrl)!}
                alt={review.user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Link
                href={`/profile/${review.user?.username}`}
                className="text-[15px] font-bold text-zinc-100 hover:text-amber-400 transition-colors"
              >
                {review.user?.displayName || review.user?.username}
              </Link>
              {review.rating ? <StarRating rating={review.rating} /> : null}
            </div>
            <span className="text-[11px] uppercase tracking-widest text-zinc-600 font-bold">
              {new Date(review.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          {review.title && (
            <h4 className="text-base font-bold text-white mb-2 leading-tight tracking-tight">{review.title}</h4>
          )}
          <p className="text-[15px] text-zinc-400 leading-relaxed line-clamp-4 group-hover:text-zinc-300 transition-colors">
            {review.content}
          </p>

          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/[0.03]">
            <button className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-red-400 transition-colors">
              <Heart className="h-4 w-4" />
              <span>{review.likesCount || 0}</span>
            </button>
            <button className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-purple-400 transition-colors">
              <MessageCircle className="h-4 w-4" />
              <span>{review.commentsCount || 0}</span>
            </button>
            <button className="ml-auto text-xs font-bold text-zinc-600 hover:text-white transition-colors">
              Read More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
