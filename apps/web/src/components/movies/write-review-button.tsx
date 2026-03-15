"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { LogModal } from "@/components/media";

interface WriteReviewButtonProps {
  movie: {
    id: string;
    title: string;
    posterPath?: string | null;
    releaseDate?: string | null;
  };
}

export function WriteReviewButton({ movie }: WriteReviewButtonProps) {
  const [open, setOpen] = useState(false);
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : undefined;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-zinc-300 border border-white/10 bg-white/[0.04] hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-400 transition-all duration-200"
      >
        <PenLine className="h-3.5 w-3.5" />
        Write a Review
      </button>

      <LogModal
        isOpen={open}
        onClose={() => setOpen(false)}
        media={{
          id: movie.id,
          title: movie.title,
          posterPath: movie.posterPath ?? undefined,
          year,
          type: "movie",
        }}
        onSubmit={() => setOpen(false)}
      />
    </>
  );
}
