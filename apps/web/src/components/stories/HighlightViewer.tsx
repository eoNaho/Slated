"use client";

import * as React from "react";
import { StoryHighlight } from "@/lib/api";
import { useHighlightStories } from "@/hooks/queries/use-stories";
import { StoryViewer } from "./StoryViewer";
import { Story } from "@/types/stories";
import { Loader2 } from "lucide-react";

interface HighlightViewerProps {
  highlight: StoryHighlight;
  onClose: () => void;
}

export function HighlightViewer({ highlight, onClose }: HighlightViewerProps) {
  const { data, isLoading } = useHighlightStories(highlight.id);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  const stories = (data?.stories ?? []) as unknown as Story[];

  if (stories.length === 0) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
        onClick={onClose}
      >
        <p className="text-white/40">Nenhum story neste highlight</p>
      </div>
    );
  }

  return <StoryViewer stories={stories} onClose={onClose} readOnly />;
}
