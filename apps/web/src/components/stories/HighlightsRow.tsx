"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Play } from "lucide-react";
import { cn, resolveImage } from "@/lib/utils";
import { StoryHighlight } from "@/lib/api";
import { HighlightViewer } from "./HighlightViewer";
import { HighlightEditorModal } from "./HighlightEditorModal";

interface HighlightsRowProps {
  highlights: StoryHighlight[];
  isOwnProfile?: boolean;
  onHighlightCreated?: () => void;
}

export function HighlightsRow({ highlights, isOwnProfile, onHighlightCreated }: HighlightsRowProps) {
  const [viewingHighlight, setViewingHighlight] = React.useState<StoryHighlight | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  if (highlights.length === 0 && !isOwnProfile) return null;

  return (
    <>
      <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
        {isOwnProfile && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <div className="w-16 h-16 rounded-2xl border border-dashed border-white/20 group-hover:border-purple-500/50 bg-white/5 group-hover:bg-white/10 transition-all flex items-center justify-center">
              <Plus className="w-5 h-5 text-white/40 group-hover:text-purple-400 transition-colors" />
            </div>
            <span className="text-[10px] font-medium text-zinc-600 group-hover:text-zinc-400 transition-colors uppercase tracking-wider">
              Novo
            </span>
          </button>
        )}

        {highlights.map((highlight) => (
          <button
            key={highlight.id}
            onClick={() => setViewingHighlight(highlight)}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl p-[2px] bg-gradient-to-br from-purple-500/60 to-pink-500/60 group-hover:from-purple-400 group-hover:to-pink-400 transition-all">
              <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-zinc-900 border-2 border-zinc-950">
                {highlight.coverImageUrl ? (
                  <Image
                    fill
                    src={resolveImage(highlight.coverImageUrl) || ""}
                    className="object-cover"
                    alt={highlight.name}
                  />
                ) : highlight.previewStories?.[0]?.imageUrl ? (
                  <Image
                    fill
                    src={resolveImage(highlight.previewStories[0].imageUrl) || ""}
                    className="object-cover"
                    alt=""
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <Play className="w-5 h-5 text-zinc-600" />
                  </div>
                )}
              </div>
            </div>
            <span className={cn(
              "text-[10px] font-medium uppercase tracking-wider transition-colors max-w-[64px] truncate",
              "text-zinc-500 group-hover:text-zinc-300"
            )}>
              {highlight.name}
            </span>
          </button>
        ))}
      </div>

      {viewingHighlight && (
        <HighlightViewer
          highlight={viewingHighlight}
          onClose={() => setViewingHighlight(null)}
        />
      )}

      {isCreating && (
        <HighlightEditorModal
          onClose={() => setIsCreating(false)}
          onSuccess={() => {
            setIsCreating(false);
            onHighlightCreated?.();
          }}
        />
      )}
    </>
  );
}
