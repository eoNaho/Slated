"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Heart, MessageCircle, EyeOff, Eye, Flag } from "lucide-react";
import { resolveImage } from "@/lib/utils";
import type { Review } from "@/types";
import Image from "next/image";
import { ReportModal } from "@/components/moderation/report-modal";

interface MovieReviewCardProps {
  review: Review;
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = rating >= i;
        const half = !filled && rating >= i - 0.5;
        return (
          <div key={i} className="relative w-3 h-3">
            <Star className="w-3 h-3 text-zinc-700" />
            {(filled || half) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: half ? "50%" : "100%" }}
              >
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MovieReviewCard({ review }: MovieReviewCardProps) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [showReport, setShowReport] = useState(false);

  return (
    <div
      className="group relative rounded-2xl p-6 border border-white/[0.05] transition-all duration-300 hover:border-white/20 hover:bg-white/[0.02] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex items-start gap-5">
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-2 ring-white/10 transition-transform group-hover:scale-110 duration-300">
          {review.user?.avatarUrl ? (
            <Image
              src={resolveImage(review.user.avatarUrl) ?? ""}
              alt={review.user.username ?? ""}
              className="w-full h-full object-cover"
              fill
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">
              👤
            </div>
          )}
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
              {review.rating ? <ReviewStars rating={review.rating} /> : null}
            </div>
            <span className="text-[11px] uppercase tracking-widest text-zinc-600 font-bold">
              {new Date(review.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          {review.title && (
            <h4 className="text-base font-bold text-white mb-2 leading-tight tracking-tight">
              {review.title}
            </h4>
          )}

          {review.containsSpoilers && !spoilerRevealed ? (
            <button
              onClick={() => setSpoilerRevealed(true)}
              className="flex items-center gap-2 text-sm text-amber-500/80 hover:text-amber-400 transition-colors py-3 px-4 rounded-xl bg-amber-500/5 border border-amber-500/20 w-full"
            >
              <EyeOff className="h-4 w-4 shrink-0" />
              <span>This review contains spoilers — click to reveal</span>
            </button>
          ) : (
            <div>
              {review.containsSpoilers && (
                <button
                  onClick={() => setSpoilerRevealed(false)}
                  className="flex items-center gap-1 text-[11px] text-amber-500/60 hover:text-amber-400 transition-colors mb-2"
                >
                  <Eye className="h-3 w-3" />
                  <span>Spoiler</span>
                </button>
              )}
              <p className="text-[15px] text-zinc-400 leading-relaxed line-clamp-4 group-hover:text-zinc-300 transition-colors">
                {review.content}
              </p>
            </div>
          )}

          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/[0.03]">
            <span className="flex items-center gap-2 text-xs font-bold text-zinc-500">
              <Heart className="h-4 w-4" />
              {review.likesCount || 0}
            </span>
            <span className="flex items-center gap-2 text-xs font-bold text-zinc-500">
              <MessageCircle className="h-4 w-4" />
              {review.commentsCount || 0}
            </span>
            <button
              onClick={(e) => { e.preventDefault(); setShowReport(true); }}
              className="ml-auto flex items-center gap-1.5 text-xs text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Denunciar review"
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showReport && (
        <ReportModal
          targetType="review"
          targetId={String(review.id)}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
