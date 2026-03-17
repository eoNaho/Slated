import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { StarRating } from "@/components/common/star-rating";
import type { Review } from "@/types";

interface MovieReviewCardProps {
  review: Review;
}

export function MovieReviewCard({ review }: MovieReviewCardProps) {
  return (
    <div
      className="rounded-xl p-4 border border-white/[0.05] transition-colors hover:border-white/[0.09]"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-white/10">
          {review.user?.avatarUrl ? (
            <Image
              src={review.user.avatarUrl}
              alt={review.user.username}
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-base">👤</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Link
              href={`/profile/${review.user?.username}`}
              className="text-sm font-semibold text-zinc-200 hover:text-amber-400 transition-colors"
            >
              {review.user?.displayName || review.user?.username}
            </Link>
            {review.rating ? <StarRating rating={review.rating} /> : null}
            <span className="text-xs text-zinc-700 ml-auto flex-shrink-0">
              {new Date(review.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          {review.title && (
            <p className="text-sm font-medium text-zinc-200 mb-1">{review.title}</p>
          )}
          <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{review.content}</p>

          <div className="flex items-center gap-4 mt-2.5 text-xs text-zinc-600">
            <span className="flex items-center gap-1 hover:text-zinc-400 cursor-pointer transition-colors">
              <Heart className="h-3 w-3" />
              {review.likesCount}
            </span>
            <span className="flex items-center gap-1 hover:text-zinc-400 cursor-pointer transition-colors">
              <MessageCircle className="h-3 w-3" />
              {review.commentsCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
