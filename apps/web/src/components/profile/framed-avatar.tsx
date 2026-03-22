"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { resolveImage } from "@/lib/utils";
import type { ProfileFrame } from "@/types";

interface FramedAvatarProps {
  avatarUrl?: string | null;
  username: string;
  frame?: Pick<ProfileFrame, "color" | "isAnimated" | "slug"> | null;
  hasUnseen?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
}

const SIZES = {
  sm: { outer: "w-10 h-10", inner: "rounded-xl", img: "rounded-[10px]" },
  md: { outer: "w-16 h-16", inner: "rounded-xl", img: "rounded-[10px]" },
  lg: { outer: "w-28 h-28", inner: "rounded-2xl", img: "rounded-[14px]" },
  xl: { outer: "w-36 h-36 lg:w-40 lg:h-40", inner: "rounded-2xl", img: "rounded-[14px]" },
};

export function FramedAvatar({
  avatarUrl,
  username,
  frame,
  hasUnseen,
  size = "xl",
  className,
  onClick,
}: FramedAvatarProps) {
  const { outer, inner, img } = SIZES[size];

  const src =
    resolveImage(avatarUrl) ||
    `https://ui-avatars.com/api/?name=${username}&size=160&background=7c3aed&color=fff`;

  // Story gradient ring (unseen stories)
  if (hasUnseen) {
    return (
      <div
        className={cn("relative shrink-0 group", onClick && "cursor-pointer", className)}
        onClick={onClick}
      >
        <div
          className={cn(
            outer,
            "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[3px] rounded-2xl animate-pulse shadow-2xl",
            onClick && "active:scale-95 transition-transform"
          )}
        >
          <div className={cn("relative w-full h-full bg-zinc-950 overflow-hidden border-2 border-zinc-950", inner)}>
            <Image fill src={src} alt={username} className={cn("object-cover", img)} />
          </div>
        </div>
      </div>
    );
  }

  // Frame ring
  if (frame) {
    return (
      <div
        className={cn("relative shrink-0 group", onClick && "cursor-pointer", className)}
        onClick={onClick}
      >
        <div
          className={cn(
            outer,
            "p-[3px] rounded-2xl shadow-2xl",
            frame.isAnimated && "animate-spin-slow",
            onClick && "active:scale-95 transition-transform"
          )}
          style={{ background: frame.color }}
        >
          <div className={cn("relative w-full h-full bg-zinc-950 overflow-hidden border-2 border-zinc-950", inner)}>
            <Image fill src={src} alt={username} className={cn("object-cover", img)} />
          </div>
        </div>
      </div>
    );
  }

  // Default (no frame, no story)
  return (
    <div
      className={cn("relative shrink-0 group", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      <div
        className={cn(
          outer,
          "bg-zinc-950 p-0.5 rounded-2xl shadow-2xl ring-1 ring-white/10",
          onClick && "active:scale-95 transition-transform"
        )}
      >
        <div className={cn("relative w-full h-full bg-zinc-950 overflow-hidden border-2 border-zinc-950", inner)}>
          <Image fill src={src} alt={username} className={cn("object-cover", img)} />
        </div>
      </div>
    </div>
  );
}
