"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlideState {
  id: string;
  type: string;
  content: Record<string, unknown>;
  imagePreview?: string | null;
}

interface SlideNavigatorProps {
  slides: SlideState[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function SlideNavigator({ slides, activeIndex, onSelect, onAdd, onRemove }: SlideNavigatorProps) {
  if (slides.length <= 1 && slides.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {slides.map((slide, i) => (
        <div key={slide.id} className="relative shrink-0 group">
          <button
            onClick={() => onSelect(i)}
            className={cn(
              "w-12 h-20 rounded-lg overflow-hidden border-2 transition-all",
              activeIndex === i
                ? "border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                : "border-white/10 hover:border-white/30"
            )}
          >
            {slide.imagePreview ? (
              <Image src={slide.imagePreview} alt="" fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <span className="text-[8px] text-zinc-500 uppercase font-bold">{slide.type.slice(0, 3)}</span>
              </div>
            )}
          </button>
          {slides.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5 text-white/60" />
            </button>
          )}
          <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-white/40 font-medium">
            {i + 1}
          </span>
        </div>
      ))}

      {slides.length < 5 && (
        <button
          onClick={onAdd}
          className="w-12 h-20 shrink-0 rounded-lg border-2 border-dashed border-white/15 hover:border-purple-500/50 hover:bg-white/5 transition-all flex items-center justify-center"
        >
          <Plus className="w-4 h-4 text-white/30" />
        </button>
      )}
    </div>
  );
}
