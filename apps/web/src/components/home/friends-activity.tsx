"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, List, Heart, ChevronRight, UserCircle } from "lucide-react";
import { usePersonalFeed } from "@/hooks/queries/use-feed";
import { useUserRecommendations } from "@/hooks/queries/use-recommendations";
import { useSession } from "@/lib/auth-client";
import { resolveImage } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { SocialProofBadge } from "@/components/feed/social-proof-badge";
import type { Activity } from "@/types";

const activityConfig = {
  watch: { icon: Play, label: "Assistiu", color: "bg-green-500" },
  review: { icon: Star, label: "Avaliou", color: "bg-yellow-500" },
  list: { icon: List, label: "Adicionou", color: "bg-purple-500" },
  like: { icon: Heart, label: "Curtiu", color: "bg-red-500" },
} as const;

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function getActivityHref(activity: Activity): string {
  if (activity.type === "list") {
    return `/lists/${activity.data?.username ?? activity.user?.username}/${activity.data?.slug ?? ""}`;
  }
  const section = activity.data?.mediaType === "series" ? "series" : "movies";
  return `/${section}/${activity.data?.id ?? activity.targetId ?? ""}`;
}

function ActivityCard({ activity, socialProofCount = 0 }: { activity: Activity; socialProofCount?: number }) {
  const config = activityConfig[activity.type as keyof typeof activityConfig];
  if (!config) return null;

  const { icon: Icon, label, color } = config;
  const href = getActivityHref(activity);
  const title = activity.data?.name ?? activity.data?.title;
  const poster = resolveImage(activity.data?.posterPath ?? null);
  const avatar = resolveImage(activity.user?.avatarUrl ?? null);

  return (
    <Link
      href={href}
      className="group flex-shrink-0 w-32 rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all block"
    >
      {/* Poster */}
      <div className="aspect-[2/3] bg-zinc-800 relative">
        {poster ? (
          <Image
            src={poster}
            alt={title ?? ""}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-6 h-6 text-zinc-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

        {/* Activity type badge */}
        <div className={`absolute top-2 left-2 w-5 h-5 rounded-full ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-2.5 h-2.5 text-white" />
        </div>

        {/* Social proof badge */}
        {socialProofCount >= 2 && (
          <div className="absolute top-2 right-2">
            <SocialProofBadge count={socialProofCount} />
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 inset-x-0 p-2">
          {title && (
            <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2 mb-1.5">
              {title}
            </p>
          )}
          <div className="flex items-center gap-1">
            {avatar ? (
              <Image
                src={avatar}
                alt=""
                width={14}
                height={14}
                className="w-3.5 h-3.5 rounded-full object-cover border border-white/20 flex-shrink-0"
              />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-zinc-700 flex-shrink-0" />
            )}
            <span className="text-zinc-400 text-[10px] truncate">
              {activity.user?.displayName ?? activity.user?.username}
            </span>
          </div>
          <p className="text-zinc-600 text-[10px] mt-0.5">
            {label} · {formatTimeAgo(activity.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-32 aspect-[2/3] rounded-xl bg-zinc-800/60 animate-pulse" />
  );
}

interface SuggestedUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

function SuggestedUserCard({ user }: { user: SuggestedUser }) {
  const [followed, setFollowed] = useState(false);
  const avatar = resolveImage(user.avatarUrl ?? null);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (followed) return;
    try {
      await api.users.follow(user.id);
      setFollowed(true);
      toast.success(`Now following ${user.displayName ?? user.username}`);
    } catch {
      toast.error("Failed to follow");
    }
  };

  return (
    <div className="flex-shrink-0 w-32 rounded-xl overflow-hidden border border-purple-500/20 bg-zinc-900/70">
      <div className="aspect-[2/3] relative flex flex-col items-center justify-center gap-2 p-3">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
          {avatar ? (
            <Image src={avatar} alt={user.displayName ?? user.username ?? ""} width={56} height={56} className="object-cover w-full h-full" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UserCircle className="w-8 h-8 text-zinc-600" />
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="text-[11px] font-semibold text-zinc-200 line-clamp-1">
            {user.displayName ?? user.username}
          </p>
          <p className="text-[10px] text-zinc-500 truncate">@{user.username}</p>
        </div>
        <button
          onClick={handleFollow}
          className={`w-full text-[10px] font-medium py-1 rounded-md transition-colors ${
            followed
              ? "bg-zinc-700 text-zinc-400 cursor-default"
              : "bg-purple-600/80 hover:bg-purple-600 text-white"
          }`}
        >
          {followed ? "Following" : "Follow"}
        </button>
      </div>
    </div>
  );
}

export function FriendsActivity() {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const { data, isLoading } = usePersonalFeed(1, mounted && !!session?.user);
  const { data: suggestedData } = useUserRecommendations({ limit: 4 }, mounted && !!session?.user);

  useEffect(() => setMounted(true), []);

  if (!mounted || !session?.user) return null;

  const activities = (data?.data ?? [])
    .filter((a) =>
      Object.keys(activityConfig).includes(a.type) &&
      (a.data?.posterPath || a.data?.name || a.data?.title)
    )
    .slice(0, 14);

  const suggestedUsers = suggestedData?.data ?? [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-6">
        <div className="h-5 w-44 bg-zinc-800 rounded mb-4 animate-pulse" />
        <div className="flex gap-2.5">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (activities.length === 0) return null;

  // Interleave a suggested user card every 5th activity
  type FeedItem =
    | { kind: "activity"; data: Activity }
    | { kind: "user"; data: SuggestedUser };

  const interleaved: FeedItem[] = [];
  let userIdx = 0;
  activities.forEach((activity, i) => {
    interleaved.push({ kind: "activity", data: activity });
    if ((i + 1) % 5 === 0 && userIdx < suggestedUsers.length) {
      interleaved.push({ kind: "user", data: suggestedUsers[userIdx++] });
    }
  });

  return (
    <section className="container mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-white">Friends Activity</h2>
        <Link
          href="/feed"
          className="flex items-center gap-0.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          See all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {interleaved.map((item, i) =>
          item.kind === "activity" ? (
            <ActivityCard key={item.data.id} activity={item.data} />
          ) : (
            <SuggestedUserCard key={`suggested-${item.data.id}-${i}`} user={item.data} />
          )
        )}
      </div>
    </section>
  );
}
