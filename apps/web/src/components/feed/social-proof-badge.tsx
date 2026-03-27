"use client";

import { Users } from "lucide-react";

interface SocialProofBadgeProps {
  count: number;
  className?: string;
}

/**
 * Badge shown when N people you follow watched the same media.
 * Only renders if count >= 2.
 */
export function SocialProofBadge({ count, className = "" }: SocialProofBadgeProps) {
  if (count < 2) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-600/15 border border-purple-500/20 text-[11px] text-purple-300 font-medium ${className}`}
      title={`${count} people you follow watched this`}
    >
      <Users className="h-3 w-3" />
      {count} watched
    </span>
  );
}
