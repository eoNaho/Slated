"use client";

import * as React from "react";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateStoryModal } from "./CreateStoryModal";
import { StoryType, StoryContent } from "@/types/stories";
import type { SearchResult } from "@/types";

type SelectedMedia = Pick<SearchResult, "id" | "title" | "posterPath" | "mediaType" | "localId"> | null;

interface ShareToStoryButtonProps {
  initialData: {
    type?: StoryType;
    content?: Partial<StoryContent>;
    media?: SelectedMedia;
  };
  className?: string;
  label?: string;
}

export function ShareToStoryButton({ initialData, className, label = "Story" }: ShareToStoryButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors",
          className
        )}
      >
        <Share2 className="w-4 h-4" />
        <span>{label}</span>
      </button>

      {isOpen && (
        <CreateStoryModal
          onClose={() => setIsOpen(false)}
          initialData={initialData}
        />
      )}
    </>
  );
}
