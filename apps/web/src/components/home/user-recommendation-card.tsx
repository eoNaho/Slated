"use client";

import Image from "next/image";
import Link from "next/link";
import { UserCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";
import { FeedbackButtons } from "@/components/recommendations/feedback-buttons";

interface UserRecommendationCardProps {
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    similarity?: number;
    mutualFollows?: number;
  };
  onDismiss?: (id: string) => void;
}

export function UserRecommendationCard({ user, onDismiss }: UserRecommendationCardProps) {
  const [followed, setFollowed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading || followed) return;
    setLoading(true);
    try {
      await api.users.follow(user.id);
      setFollowed(true);
      toast.success(`Now following ${user.displayName ?? user.username}`);
    } catch {
      toast.error("Failed to follow user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-shrink-0 w-[160px] group">
      <Link href={`/profile/${user.username}`} className="block">
        <div className="relative w-[160px] h-[160px] rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-500/50 transition-colors mx-auto">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.displayName ?? user.username ?? "User"}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UserCircle className="h-16 w-16 text-zinc-700" />
            </div>
          )}
        </div>

        <div className="mt-3 text-center">
          <p className="text-sm font-semibold text-zinc-200 group-hover:text-purple-400 transition-colors truncate">
            {user.displayName ?? user.username}
          </p>
          {user.username && (
            <p className="text-xs text-zinc-500 truncate">@{user.username}</p>
          )}
          {user.similarity !== undefined && (
            <p className="text-xs text-purple-400/80 mt-0.5">
              {Math.round(user.similarity * 100)}% taste match
            </p>
          )}
          {user.mutualFollows !== undefined && user.mutualFollows > 0 && (
            <p className="text-[11px] text-zinc-600 mt-0.5">
              {user.mutualFollows} mutual follow{user.mutualFollows > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </Link>

      <div className="mt-3 flex flex-col gap-2 items-center">
        <button
          onClick={handleFollow}
          disabled={loading || followed}
          className={`w-full text-xs font-medium py-1.5 rounded-lg transition-colors ${
            followed
              ? "bg-zinc-800 text-zinc-500 cursor-default"
              : "bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-60"
          }`}
        >
          {followed ? "Following" : loading ? "..." : "Follow"}
        </button>
        <FeedbackButtons
          targetType="user"
          targetId={user.id}
          source="people_you_may_know"
          onDismiss={() => onDismiss?.(user.id)}
        />
      </div>
    </div>
  );
}
