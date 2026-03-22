"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Archive } from "lucide-react";
import { useStoryArchive } from "@/hooks/queries/use-stories";
import { StoryViewer } from "./StoryViewer";
import { Story } from "@/types/stories";
import { resolveImage } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  watch: "Assistindo",
  rating: "Nota",
  list: "Lista",
  poll: "Poll",
  hot_take: "Hot Take",
  rewind: "Rewind",
  countdown: "Contagem",
  quiz: "Quiz",
  question_box: "Pergunta",
};

export function StoryArchiveGrid() {
  const { data, isLoading } = useStoryArchive();
  const [viewing, setViewing] = React.useState<Story[] | null>(null);
  const [viewIndex, setViewIndex] = React.useState(0);

  const stories = (data?.data ?? []) as unknown as Story[];

  const handleOpen = (index: number) => {
    setViewIndex(index);
    setViewing(stories);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-7 h-7 text-white/30 animate-spin" />
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <Archive className="w-10 h-10 text-white/20" />
        <p className="text-white/40 text-sm">Nenhum story arquivado</p>
        <p className="text-white/25 text-xs max-w-xs">
          Stories expirados são arquivados automaticamente e ficam disponíveis aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1">
        {stories.map((story, i) => (
          <button
            key={story.id}
            onClick={() => handleOpen(i)}
            className="relative aspect-[9/16] overflow-hidden bg-zinc-900 hover:opacity-80 transition-opacity"
          >
            {story.imageUrl ? (
              <Image
                fill
                src={resolveImage(story.imageUrl) || ""}
                alt=""
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">
                  {TYPE_LABELS[story.type] ?? story.type}
                </span>
              </div>
            )}
            {/* Type badge */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <span className="text-[9px] text-white/60 font-medium uppercase tracking-wider">
                {TYPE_LABELS[story.type] ?? story.type}
              </span>
            </div>
          </button>
        ))}
      </div>

      {viewing && (
        <StoryViewer
          stories={viewing}
          initialIndex={viewIndex}
          onClose={() => setViewing(null)}
          readOnly
        />
      )}
    </>
  );
}
