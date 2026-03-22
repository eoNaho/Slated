"use client";

import * as React from "react";
import { Globe, Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { StoryVisibility } from "@/types/stories";

interface VisibilitySelectorProps {
  value: StoryVisibility;
  onChange: (value: StoryVisibility) => void;
}

const options: { value: StoryVisibility; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "public", label: "Público", icon: <Globe className="w-3.5 h-3.5" />, color: "text-zinc-300" },
  { value: "followers", label: "Seguidores", icon: <Users className="w-3.5 h-3.5" />, color: "text-blue-400" },
  { value: "close_friends", label: "Amigos", icon: <Star className="w-3.5 h-3.5" />, color: "text-green-400" },
];

export function VisibilitySelector({ value, onChange }: VisibilitySelectorProps) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-white/10 bg-white/5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium transition-all",
            value === opt.value
              ? `bg-white/10 ${opt.color}`
              : "text-white/40 hover:text-white/60 hover:bg-white/5"
          )}
        >
          {opt.icon}
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export function VisibilityBadge({ visibility }: { visibility?: string }) {
  if (!visibility || visibility === "public") return null;

  if (visibility === "close_friends") {
    return (
      <div className="flex items-center gap-1 bg-green-500/20 border border-green-500/30 rounded-full px-2 py-0.5">
        <Star className="w-3 h-3 text-green-400 fill-green-400" />
        <span className="text-green-400 text-xs font-medium">Amigos</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-blue-500/20 border border-blue-500/30 rounded-full px-2 py-0.5">
      <Users className="w-3 h-3 text-blue-400" />
      <span className="text-blue-400 text-xs font-medium">Seguidores</span>
    </div>
  );
}
