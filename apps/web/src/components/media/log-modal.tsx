"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  X,
  Heart,
  Calendar,
  RotateCcw,
  Send,
  AlertTriangle,
  ChevronDown,
  Smile,
} from "lucide-react";
import type { EmojiClickData } from "emoji-picker-react";
import { StarRatingInput } from "./star-rating-input";
import { resolveImage } from "@/lib/utils";

// Heavy picker loaded client-side only
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: {
    id: string;
    title: string;
    posterPath?: string | null;
    year?: number;
    type: "movie" | "series";
  };
  onSubmit?: (data: LogData) => void;
  initialData?: Partial<LogData>;
}

export interface LogData {
  rating: number;
  liked: boolean;
  watchedDate: string;
  isRewatch: boolean;
  reviewTitle: string;
  review: string;
  containsSpoilers: boolean;
  tags: string[];
}

const MAX_CHARS = 2000;

// ── Component ────────────────────────────────────────────────────────────────

export function LogModal({ isOpen, onClose, media, onSubmit, initialData }: LogModalProps) {
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [liked, setLiked] = useState(initialData?.liked || false);
  const [watchedDate, setWatchedDate] = useState(
    initialData?.watchedDate || new Date().toISOString().split("T")[0],
  );
  const [isRewatch, setIsRewatch] = useState(initialData?.isRewatch || false);
  const [reviewTitle, setReviewTitle] = useState(initialData?.reviewTitle || "");
  const [review, setReview] = useState(initialData?.review || "");
  const [reviewExpanded, setReviewExpanded] = useState(!!(initialData?.review || initialData?.reviewTitle));
  const [containsSpoilers, setContainsSpoilers] = useState(initialData?.containsSpoilers || false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);

  useEffect(() => {
    if (isOpen && initialData) {
      setRating(initialData.rating || 0);
      setLiked(initialData.liked || false);
      if (initialData.watchedDate) setWatchedDate(initialData.watchedDate);
      setIsRewatch(initialData.isRewatch || false);
      setReviewTitle(initialData.reviewTitle || "");
      setReview(initialData.review || "");
      setReviewExpanded(!!(initialData.review || initialData.reviewTitle));
      setContainsSpoilers(initialData.containsSpoilers || false);
      setTags(initialData.tags || []);
    }
  }, [isOpen, initialData]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setEmojiOpen(false);
    onClose();
  }, [onClose]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (emojiOpen) {
          setEmojiOpen(false);
          return;
        }
        close();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, emojiOpen, close]);

  // Close emoji panel on outside click
  useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        emojiPanelRef.current?.contains(e.target as Node) ||
        emojiButtonRef.current?.contains(e.target as Node)
      )
        return;
      setEmojiOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [emojiOpen]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Insert emoji at cursor position in textarea
  const handleEmojiClick = (data: EmojiClickData) => {
    const emoji = data.emoji;
    const ta = textareaRef.current;
    if (!ta) {
      setReview((prev) => (prev + emoji).slice(0, MAX_CHARS));
      return;
    }
    const start = ta.selectionStart ?? review.length;
    const end = ta.selectionEnd ?? review.length;
    const next = (review.slice(0, start) + emoji + review.slice(end)).slice(
      0,
      MAX_CHARS,
    );
    setReview(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({
      rating,
      liked,
      watchedDate,
      isRewatch,
      reviewTitle,
      review,
      containsSpoilers,
      tags: [],
    });
    close();
  };

  const charsLeft = MAX_CHARS - review.length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={close}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg z-10 overflow-visible rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: "#111113",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* ── HEADER ── */}
        <div
          className="relative overflow-hidden rounded-t-2xl"
          style={{ height: 112 }}
        >
          {media.posterPath && (
            <img
              src={resolveImage(media.posterPath) ?? ""}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-30"
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 30%, #111113 95%)",
            }}
          />

          <button
            onClick={close}
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-white transition-colors z-10"
            style={{ background: "rgba(0,0,0,0.4)" }}
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="absolute bottom-4 left-4 right-12 flex items-end gap-3">
            {media.posterPath && (
              <img
                src={resolveImage(media.posterPath) ?? ""}
                alt={media.title}
                className="w-14 h-20 object-cover rounded-lg shadow-xl flex-shrink-0"
                style={{
                  boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  outline: "1px solid rgba(255,255,255,0.1)",
                }}
              />
            )}
            <div className="flex-1 min-w-0 pb-0.5">
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 mb-1">
                {media.type === "movie" ? "Log & Review" : "Log & Review · Série"}
              </p>
              <h2 className="text-lg font-black text-white leading-tight truncate tracking-tight">
                {media.title}
              </h2>
              {media.year && (
                <p className="text-xs text-zinc-500 mt-0.5">{media.year}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── FORM ── */}
        <form onSubmit={handleSubmit} className="px-5 pb-5 pt-4 space-y-5">
          {/* Rating */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Rating
            </span>
            <StarRatingInput value={rating} onChange={setRating} size="lg" />
          </div>

          {/* Like · Rewatch · Date */}
          <div className="flex items-center gap-2">
            <ToggleButton
              active={liked}
              onClick={() => setLiked(!liked)}
              activeClass="bg-red-500/10 border-red-500/30 text-red-400"
              icon={
                <Heart
                  className={`h-3.5 w-3.5 ${liked ? "fill-red-400" : ""}`}
                />
              }
              label="Liked"
            />
            <ToggleButton
              active={isRewatch}
              onClick={() => setIsRewatch(!isRewatch)}
              activeClass="bg-blue-500/10 border-blue-500/30 text-blue-400"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              label="Rewatch"
            />
            <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400">
              <Calendar className="h-3.5 w-3.5 text-zinc-600" />
              <input
                type="date"
                value={watchedDate}
                onChange={(e) => setWatchedDate(e.target.value)}
                className="bg-transparent text-zinc-300 text-xs focus:outline-none focus:text-white transition-colors cursor-pointer"
              />
            </div>
          </div>

          {/* Review section */}
          <div className="relative">
            {!reviewExpanded ? (
              <button
                type="button"
                onClick={() => {
                  setReviewExpanded(true);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
              >
                <span className="truncate">
                  {reviewTitle || review
                    ? (reviewTitle || review).slice(0, 50) + ((reviewTitle || review).length > 50 ? "…" : "")
                    : "Add a review…"}
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
              </button>
            ) : (
              <div className="space-y-2">
                {/* Title input */}
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value.slice(0, 100))}
                  placeholder="Título da review (opcional)"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none bg-transparent"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                />

                {/* Textarea wrapper */}
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <textarea
                    ref={textareaRef}
                    value={review}
                    onChange={(e) =>
                      setReview(e.target.value.slice(0, MAX_CHARS))
                    }
                    placeholder="O que você achou? Use emojis para dar mais expressão 😄"
                    rows={5}
                    autoFocus
                    className="w-full px-4 pt-3 pb-10 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none bg-transparent"
                  />

                  {/* Toolbar abaixo da textarea */}
                  <div
                    className="absolute bottom-0 inset-x-0 flex items-center justify-between px-3 py-2"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Emoji picker button */}
                    <button
                      ref={emojiButtonRef}
                      type="button"
                      onClick={() => setEmojiOpen((v) => !v)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 transition-all text-xs"
                    >
                      <Smile className="h-4 w-4" />
                      Emoji
                    </button>

                    {/* Char counter */}
                    <span
                      className="text-[10px] tabular-nums"
                      style={{
                        color:
                          charsLeft < 100 ? "#f5c518" : "rgba(255,255,255,0.2)",
                      }}
                    >
                      {charsLeft}
                    </span>
                  </div>
                </div>

                {/* ── EMOJI PICKER ── */}
                {emojiOpen && (
                  <div ref={emojiPanelRef} className="z-20">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme={"dark" as any}
                      width="100%"
                      height={340}
                      searchPlaceholder="Buscar emoji…"
                      skinTonesDisabled
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}

                {/* Spoilers toggle */}
                <label className="flex items-center gap-2 cursor-pointer group w-fit">
                  <div
                    onClick={() => setContainsSpoilers(!containsSpoilers)}
                    className="w-8 h-4 rounded-full relative transition-colors flex-shrink-0"
                    style={{
                      background: containsSpoilers
                        ? "#f5c518"
                        : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <div
                      className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                      style={{
                        left: containsSpoilers ? "calc(100% - 14px)" : "2px",
                      }}
                    />
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors select-none">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    Contém spoilers
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, #9918f5ff 0%, #8600e5ff 100%)",
            }}
          >
            <Send className="h-4 w-4" />
            Salvar
          </button>
        </form>
      </div>
    </div>
  );
}

// ── ToggleButton ─────────────────────────────────────────────────────────────

function ToggleButton({
  active,
  onClick,
  activeClass,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  activeClass: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
        active
          ? activeClass
          : "text-zinc-400 hover:text-white border-white/[0.07] hover:border-white/[0.12]"
      }`}
      style={{ background: active ? undefined : "rgba(255,255,255,0.03)" }}
    >
      {icon}
      {label}
    </button>
  );
}
