"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Play } from "lucide-react";
import { cn, resolveImage } from "@/lib/utils";
import { StoryHighlight } from "@/lib/api";
import { HighlightViewer } from "./HighlightViewer";
import { HighlightEditorModal } from "./HighlightEditorModal";
import { Portal } from "@/components/ui/portal";

interface HighlightsRowProps {
  highlights: StoryHighlight[];
  isOwnProfile?: boolean;
  onHighlightCreated?: () => void;
}

export function HighlightsRow({ highlights, isOwnProfile, onHighlightCreated }: HighlightsRowProps) {
  const [viewingHighlight, setViewingHighlight] = React.useState<StoryHighlight | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [editingHighlight, setEditingHighlight] = React.useState<StoryHighlight | null>(null);

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
          <div key={highlight.id} className="relative flex flex-col items-center gap-1.5 shrink-0 group/item">
            {/* Thumbnail — click to view */}
            <button
              onClick={() => setViewingHighlight(highlight)}
              className="w-16 h-16 rounded-2xl p-[2px] bg-gradient-to-br from-purple-500/60 to-pink-500/60 group-hover/item:from-purple-400 group-hover/item:to-pink-400 transition-all"
            >
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
            </button>

            {/* Edit button — sibling, not nested inside the view button */}
            {isOwnProfile && (
              <button
                onClick={() => setEditingHighlight(highlight)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-zinc-700"
              >
                <svg className="w-2.5 h-2.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}

            <span className={cn(
              "text-[10px] font-medium uppercase tracking-wider transition-colors max-w-[64px] truncate",
              "text-zinc-500 group-hover/item:text-zinc-300"
            )}>
              {highlight.name}
            </span>
          </div>
        ))}
      </div>

      {viewingHighlight && (
        <Portal>
          <HighlightViewer
            highlight={viewingHighlight}
            onClose={() => setViewingHighlight(null)}
          />
        </Portal>
      )}

      {(isCreating || editingHighlight) && (
        <Portal>
          <HighlightEditorModal
            existing={editingHighlight ?? undefined}
            onClose={() => { setIsCreating(false); setEditingHighlight(null); }}
            onSuccess={() => {
              setIsCreating(false);
              setEditingHighlight(null);
              onHighlightCreated?.();
            }}
          />
        </Portal>
      )}
    </>
  );
}
