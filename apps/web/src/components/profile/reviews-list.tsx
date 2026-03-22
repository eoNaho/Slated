"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  Heart,
  MessageCircle,
  ChevronRight,
  EyeOff,
  Send,
  Loader2,
  Reply,
  Trash2,
} from "lucide-react";
import { RatingStars } from "./rating-stars";
import type { Review, Comment } from "@/types";
import { getMediaUrl, resolveImage } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useReviewComments } from "@/hooks/queries/use-review-comments";

interface ReviewsListProps {
  reviews: Review[];
  limit?: number;
  showViewAll?: boolean;
  currentUserId?: string;
  customCovers?: Record<string, string>;
}

// ── Comment Item ─────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
}: {
  comment: Comment;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onReply: (comment: Comment) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(comment.likesCount);
  const isOwn = currentUserId === comment.userId;

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    setLikes((n) => n + 1);
    try {
      await api.comments.like(comment.id);
    } catch {
      setLiked(false);
      setLikes((n) => n - 1);
    }
  };

  const handleDelete = async () => {
    try {
      await api.comments.delete(comment.id);
      onDelete(comment.id);
    } catch {
      toast.error("Erro ao deletar comentário");
    }
  };

  const avatar = comment.user?.avatarUrl
    ? resolveImage(comment.user.avatarUrl)
    : null;
  const name = comment.user?.displayName || comment.user?.username || "User";
  const date = new Date(comment.createdAt).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <div className="relative w-7 h-7 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
        {avatar ? (
          <Image fill src={avatar} alt={name} className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
            {name[0].toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-xs font-semibold text-white">{name}</span>
          <span className="text-[10px] text-zinc-600">{date}</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{comment.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1.5">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-[10px] transition-colors ${
              liked ? "text-red-400" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            <Heart className={`h-3 w-3 ${liked ? "fill-red-400" : ""}`} />
            {likes > 0 && likes}
          </button>
          <button
            onClick={() => onReply(comment)}
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Reply className="h-3 w-3" />
            Responder
          </button>
          {isOwn && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 text-[10px] text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Comment Section ───────────────────────────────────────────────────────────

function CommentSection({
  reviewId,
  currentUserId,
}: {
  reviewId: string;
  currentUserId?: string;
}) {
  const { data: fetchedComments, isLoading: loading } = useReviewComments(reviewId);
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [localSynced, setLocalSynced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Seed local state once when query data arrives
  if (!localSynced && fetchedComments) {
    setLocalComments(fetchedComments);
    setLocalSynced(true);
  }

  const comments = localSynced ? localComments : (fetchedComments ?? []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const res = await api.comments.create({
        target_type: "review",
        target_id: reviewId,
        content,
        parent_id: replyTo?.id,
      });
      setLocalComments((prev) => [...prev, res.data]);
      setText("");
      setReplyTo(null);
    } catch {
      toast.error("Erro ao enviar comentário");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setLocalComments((prev) => prev.filter((c) => c.id !== id));
  };

  const handleReply = (comment: Comment) => {
    setReplyTo(comment);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="px-6 pb-5 space-y-4 border-t border-white/5 pt-4">
      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              onDelete={handleDelete}
              onReply={handleReply}
            />
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-xs text-zinc-600 text-center py-2">
          Nenhum comentário ainda. Seja o primeiro!
        </p>
      )}

      {/* Input */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {replyTo && (
            <div className="flex items-center justify-between text-[10px] text-zinc-500 bg-white/[0.03] px-3 py-1.5 rounded-lg">
              <span>
                Respondendo{" "}
                <span className="text-zinc-300 font-medium">
                  @{replyTo.user?.username}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder="Adicione um comentário…"
              rows={2}
              className="flex-1 px-3 py-2 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none bg-white/[0.03] border border-white/[0.06] focus:border-purple-500/40 transition-colors"
            />
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="self-end px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-zinc-600 text-center">
          <Link href="/sign-in" className="text-purple-400 hover:underline">
            Entre
          </Link>{" "}
          para comentar
        </p>
      )}
    </div>
  );
}

// ── Review Card ───────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  currentUserId,
  customCovers,
}: {
  review: Review;
  currentUserId?: string;
  customCovers?: Record<string, string>;
}) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(review.likesCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(review.commentsCount);

  const handleLike = async () => {
    if (liked) {
      // unlike
      setLiked(false);
      setLikeCount((n) => n - 1);
      try {
        await api.reviews.unlike(review.id);
      } catch {
        setLiked(true);
        setLikeCount((n) => n + 1);
      }
    } else {
      setLiked(true);
      setLikeCount((n) => n + 1);
      try {
        await api.reviews.like(review.id);
      } catch {
        setLiked(false);
        setLikeCount((n) => n - 1);
      }
    }
  };

  return (
    <div className="group relative rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/5 hover:border-zinc-700 transition-all duration-300 overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Poster */}
        {review.media && (
          <div className="sm:w-32 md:w-40 shrink-0 relative">
            <Link
              href={getMediaUrl(review.media)}
              className="block aspect-[2/3] sm:h-full w-full relative"
            >
              <Image
                fill
                src={(review.media.id && customCovers?.[review.media.id]) || resolveImage(review.media.posterPath) || ""}
                alt={review.media.title}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 sm:bg-gradient-to-r sm:from-transparent sm:to-zinc-900/90" />
            </Link>
          </div>
        )}

        {/* Content */}
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
              {new Date(review.createdAt).toLocaleDateString("pt-BR", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          {review.title && (
            <p className="text-white font-semibold text-sm mb-2">
              &ldquo;{review.title}&rdquo;
            </p>
          )}

          {/* Spoiler mask */}
          {review.containsSpoilers && !spoilerRevealed ? (
            <button
              onClick={() => setSpoilerRevealed(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-xs text-orange-400 bg-orange-500/5 border border-orange-500/15 hover:bg-orange-500/10 transition-colors mb-4"
            >
              <EyeOff className="h-3.5 w-3.5" />
              Contém spoilers — clique para revelar
            </button>
          ) : (
            <p className="text-zinc-300 text-sm leading-relaxed mb-4 line-clamp-3">
              {review.content}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
              {/* Like */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 transition-colors ${
                  liked
                    ? "text-red-400"
                    : "hover:text-red-400"
                }`}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${liked ? "fill-red-400" : ""}`}
                />
                {likeCount > 0 && likeCount}
              </button>

              {/* Comments toggle */}
              <button
                onClick={() => {
                  setCommentsOpen((v) => !v);
                }}
                className={`flex items-center gap-1.5 transition-colors ${
                  commentsOpen ? "text-blue-400" : "hover:text-blue-400"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {commentCount > 0 && commentCount}
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

      {/* Comment section (lazy) */}
      {commentsOpen && (
        <CommentSection
          reviewId={review.id}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

// ── Reviews List ─────────────────────────────────────────────────────────────

export function ReviewsList({
  reviews,
  limit,
  showViewAll = true,
  currentUserId,
  customCovers,
}: ReviewsListProps) {
  const displayReviews = limit ? reviews.slice(0, limit) : reviews;

  if (displayReviews.length === 0) return null;

  return (
    <section>
      {showViewAll && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Star className="h-5 w-5 text-purple-400" />
            Reviews
          </h2>
          <Link
            href="#"
            className="text-sm font-medium text-zinc-500 hover:text-white transition-colors flex items-center gap-1 group"
          >
            Ver todas
            <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-white transition-colors" />
          </Link>
        </div>
      )}
      <div className="space-y-6">
        {displayReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            currentUserId={currentUserId}
            customCovers={customCovers}
          />
        ))}
      </div>
    </section>
  );
}
