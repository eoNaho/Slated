"use client";

import { useState, useCallback } from "react";
import { X, Play } from "lucide-react";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useScrollLock } from "@/hooks/use-scroll-lock";

interface TrailerDialogProps {
  trailerUrl: string;
  movieTitle: string;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/[?&]v=([^&]+)/) ?? url.match(/youtu\.be\/([^?]+)/);
  return match?.[1] ?? null;
}

export function TrailerDialog({ trailerUrl, movieTitle }: TrailerDialogProps) {
  const [open, setOpen] = useState(false);
  const videoId = getYouTubeId(trailerUrl);

  const close = useCallback(() => setOpen(false), []);

  useEscapeKey(close, open);
  useScrollLock(open);

  if (!videoId) return null;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium text-white hover:bg-white/20 transition-all duration-200 group"
      >
        <Play className="h-4 w-4 fill-white group-hover:scale-110 transition-transform" />
        Watch Trailer
      </button>

      {/* Dialog */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={close}
          />

          {/* Panel */}
          <div className="relative w-full max-w-5xl z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Close */}
            <button
              onClick={close}
              aria-label="Close trailer"
              className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Title */}
            <p className="absolute -top-10 left-0 text-sm text-zinc-400 truncate max-w-[calc(100%-3rem)]">
              {movieTitle} — Official Trailer
            </p>

            {/* Video container — 16:9 */}
            <div
              className="relative w-full overflow-hidden rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] border border-white/[0.08]"
              style={{ paddingBottom: "56.25%" }}
            >
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&color=white`}
                title={`${movieTitle} Trailer`}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
