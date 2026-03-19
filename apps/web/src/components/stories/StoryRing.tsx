"use client";

import * as React from "react";
import { cn, resolveImage } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StoryRingProps {
  userId?: string;
  username?: string;
  avatarUrl?: string | null;
  displayName?: string | null;
  hasUnseenStories?: boolean;
  hasStories?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
  isCurrentUser?: boolean;
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
};

const ringPaddingMap = {
  sm: "p-[1.5px]",
  md: "p-0.5",
  lg: "p-[3px]",
  xl: "p-1",
};

export function StoryRing({
  avatarUrl,
  displayName,
  hasUnseenStories,
  hasStories,
  size = "md",
  className,
  onClick,
  isCurrentUser,
}: StoryRingProps) {
  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div
      className={cn(
        "relative flex shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95",
        className
      )}
      onClick={onClick}
    >
      {/* The Ring */}
      <div
        className={cn(
          "rounded-full transition-all duration-500",
          sizeMap[size],
          ringPaddingMap[size],
          hasUnseenStories
            ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]"
            : hasStories
            ? "bg-muted p-[1.5px]"
            : "p-0"
        )}
      >
        <div className="h-full w-full rounded-full border-2 border-background bg-background overflow-hidden">
          <Avatar className="h-full w-full border-none">
            <AvatarImage src={resolveImage(avatarUrl) || ""} alt={displayName || ""} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Add Button for Current User if no stories */}
      {isCurrentUser && !hasStories && (
        <div className="absolute bottom-0 right-0 flex h-[30%] w-[30%] items-center justify-center rounded-full border-2 border-background bg-blue-500 text-white shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-full w-full p-0.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      )}
    </div>
  );
}
