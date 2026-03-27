"use client";

import { ThumbsUp, ThumbsDown, X } from "lucide-react";
import { toast } from "sonner";
import { useRecommendationFeedback } from "@/hooks/queries/use-recommendations";

interface FeedbackButtonsProps {
  targetType: "media" | "user";
  targetId: string;
  source?: string;
  context?: string;
  onDismiss?: () => void;
  className?: string;
}

export function FeedbackButtons({
  targetType,
  targetId,
  source = "home",
  context,
  onDismiss,
  className = "",
}: FeedbackButtonsProps) {
  const { mutate: submitFeedback, isPending } = useRecommendationFeedback();

  const handleFeedback = (feedbackType: "not_interested" | "loved_it" | "not_my_taste") => {
    submitFeedback(
      { targetType, targetId, feedbackType, source, context },
      {
        onSuccess: () => {
          if (feedbackType === "not_interested" || feedbackType === "not_my_taste") {
            toast.success("Won't show this again");
            onDismiss?.();
          } else {
            toast.success("Thanks for the feedback!");
          }
        },
        onError: () => toast.error("Failed to submit feedback"),
      }
    );
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFeedback("loved_it");
        }}
        disabled={isPending}
        title="Great recommendation"
        className="p-1.5 rounded-full bg-white/10 hover:bg-green-500/30 text-zinc-400 hover:text-green-400 transition-colors disabled:opacity-50"
        aria-label="Like"
      >
        <ThumbsUp className="h-3 w-3" />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFeedback("not_my_taste");
        }}
        disabled={isPending}
        title="Not my taste"
        className="p-1.5 rounded-full bg-white/10 hover:bg-red-500/30 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
        aria-label="Dislike"
      >
        <ThumbsDown className="h-3 w-3" />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFeedback("not_interested");
        }}
        disabled={isPending}
        title="Not interested"
        className="p-1.5 rounded-full bg-white/10 hover:bg-zinc-600/60 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
