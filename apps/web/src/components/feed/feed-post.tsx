"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Eye,
  Star,
  List,
  Heart,
  UserPlus,
  Trophy,
  MessageCircle,
  Share2,
  Bookmark,
  Film,
  Tv,
  Users,
  Lock,
  Globe,
  Clapperboard,
} from "lucide-react";
import { resolveImage } from "@/lib/utils";
import { toast } from "sonner";
import type { Activity } from "@/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function mediaHref(activity: Activity): string {
  if (activity.type === "club") return `/clubs/${activity.data?.slug ?? activity.targetId ?? ""}`;
  if (activity.type === "list") {
    const user = activity.data?.username ?? activity.user?.username;
    return `/lists/${user}/${activity.data?.slug ?? ""}`;
  }
  if (activity.type === "follow") return `/profile/${activity.data?.username ?? ""}`;
  // like on a list
  if (activity.type === "like" && activity.targetType === "list") {
    const user = activity.data?.username ?? activity.user?.username;
    return `/lists/${user}/${activity.data?.slug ?? ""}`;
  }
  const section = activity.data?.mediaType === "series" ? "series" : "movies";
  return `/${section}/${activity.data?.id ?? activity.targetId ?? ""}`;
}

const ACTION_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  pill: string;
}> = {
  watch:           { label: "watched",          icon: Eye,          pill: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" },
  watched:         { label: "watched",          icon: Eye,          pill: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" },
  watched_episode: { label: "watched episode",  icon: Tv,           pill: "bg-teal-500/10    border-teal-500/25    text-teal-400"    },
  review:          { label: "reviewed",         icon: Star,         pill: "bg-yellow-500/10  border-yellow-500/25  text-yellow-400"  },
  rating:          { label: "rated",            icon: Clapperboard, pill: "bg-orange-500/10  border-orange-500/25  text-orange-400"  },
  list:         { label: "created a list",     icon: List,         pill: "bg-violet-500/10  border-violet-500/25  text-violet-400"  },
  like:         { label: "liked",              icon: Heart,        pill: "bg-rose-500/10    border-rose-500/25    text-rose-400"    },
  follow:       { label: "followed",           icon: UserPlus,     pill: "bg-sky-500/10     border-sky-500/25     text-sky-400"     },
  achievement:  { label: "earned achievement", icon: Trophy,       pill: "bg-amber-500/10   border-amber-500/25   text-amber-400"   },
  club:         { label: "created a club",     icon: Users,        pill: "bg-indigo-500/10  border-indigo-500/25  text-indigo-400"  },
};

// ── sub-components ────────────────────────────────────────────────────────────

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-px">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < Math.floor(rating);
          const half   = !filled && i < rating;
          return (
            <Star
              key={i}
              className={`h-3 w-3 ${
                filled ? "fill-yellow-400 text-yellow-400"
                : half  ? "fill-yellow-400/40 text-yellow-400/40"
                        : "fill-zinc-700 text-zinc-700"
              }`}
            />
          );
        })}
      </div>
      <span className="text-[11px] text-zinc-500 tabular-nums">{rating.toFixed(1)}</span>
    </div>
  );
}

/** Mirrors the skeleton's media card exactly: border-white/5, bg-white/[0.02], p-3, poster w-14 h-[84px], info space-y-2 pt-1 */
function MediaEmbed({ activity }: { activity: Activity }) {
  const title       = activity.data?.title ?? activity.data?.name;
  const poster      = resolveImage(activity.data?.posterPath ?? null);
  const type        = activity.data?.mediaType;
  const rating      = activity.data?.rating;
  const episodeName = activity.data?.episodeName as string | undefined;
  const episodeNum  = activity.data?.episodeNumber as number | undefined;
  const href        = mediaHref(activity);

  if (!title) return null;

  return (
    <Link
      href={href}
      className="group flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-colors p-3"
    >
      {/* Poster — same dimensions as skeleton */}
      <div className="flex-shrink-0 w-14 h-[84px] rounded-lg overflow-hidden bg-zinc-800/80">
        {poster ? (
          <Image
            src={poster}
            alt={title}
            width={56}
            height={84}
            className="object-cover w-full h-full group-hover:scale-[1.04] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {type === "series"
              ? <Tv   className="h-5 w-5 text-zinc-600" />
              : <Film className="h-5 w-5 text-zinc-600" />
            }
          </div>
        )}
      </div>

      {/* Info — space-y-2 pt-1 mirrors skeleton's stacked lines */}
      <div className="flex-1 min-w-0 space-y-2 pt-1">
        <p className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors leading-snug line-clamp-2">
          {title}
        </p>

        {/* Episode info */}
        {episodeName && (
          <p className="text-[11px] text-teal-400 truncate">
            {episodeNum != null ? `E${episodeNum} · ` : ""}{episodeName}
          </p>
        )}

        {type && !episodeName && (
          <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded border tracking-wide uppercase ${
            type === "series"
              ? "bg-pink-500/10 border-pink-500/20 text-pink-400"
              : "bg-violet-500/10 border-violet-500/20 text-violet-400"
          }`}>
            {type === "series" ? "TV Series" : "Movie"}
          </span>
        )}

        {rating != null && rating > 0 && <RatingStars rating={rating} />}
      </div>
    </Link>
  );
}

function ClubEmbed({ activity }: { activity: Activity }) {
  const { name, description, coverUrl, categories, memberCount, isPublic, allowJoinRequests, slug } =
    (activity.data ?? {}) as {
      name?: string;
      description?: string;
      coverUrl?: string;
      categories?: string[];
      memberCount?: number;
      isPublic?: boolean;
      allowJoinRequests?: boolean;
      slug?: string;
    };

  if (!name) return null;

  const cover = resolveImage(coverUrl ?? null);
  const href = `/clubs/${slug ?? activity.targetId ?? ""}`;

  return (
    <Link
      href={href}
      className="group block rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-colors overflow-hidden"
    >
      {/* Cover image — landscape 16:9 */}
      <div className="relative w-full aspect-video bg-zinc-800/80 overflow-hidden">
        {cover ? (
          <Image
            src={cover}
            alt={name}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/30 to-zinc-900">
            <Users className="h-10 w-10 text-indigo-400/40" />
          </div>
        )}
        {/* Visibility badge */}
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-sm ${
            isPublic
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : allowJoinRequests
              ? "bg-sky-500/15 border-sky-500/30 text-sky-300"
              : "bg-zinc-700/60 border-zinc-600/40 text-zinc-400"
          }`}>
            {isPublic ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
            {isPublic ? "Public" : "By Request"}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors leading-snug">
          {name}
        </p>

        {description && (
          <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2">{description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category pills */}
          {categories?.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="inline-flex px-1.5 py-0.5 rounded border text-[10px] font-medium bg-indigo-500/10 border-indigo-500/20 text-indigo-400 capitalize"
            >
              {cat}
            </span>
          ))}

          {/* Member count */}
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-zinc-500">
            <Users className="h-3 w-3" />
            {memberCount ?? 1} {(memberCount ?? 1) === 1 ? "member" : "members"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ListEmbed({ activity }: { activity: Activity }) {
  const { name, slug, username, itemCount, itemPosters } = (activity.data ?? {}) as {
    name?: string;
    slug?: string;
    username?: string;
    itemCount?: number;
    itemPosters?: string[];
  };

  const listName = name ?? activity.data?.title;
  if (!listName) return null;

  const user = username ?? activity.user?.username;
  const href = `/lists/${user}/${slug ?? ""}`;
  const posters = itemPosters?.slice(0, 4) ?? [];

  return (
    <Link
      href={href}
      className="group flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-colors p-3"
    >
      {/* Thumbnail grid or placeholder */}
      {posters.length > 0 ? (
        <div className="flex-shrink-0 grid grid-cols-2 gap-0.5 w-[72px] h-[84px] rounded-lg overflow-hidden">
          {posters.map((p, i) => {
            const src = resolveImage(p);
            return src ? (
              <Image
                key={i}
                src={src}
                alt=""
                width={36}
                height={42}
                className="object-cover w-full h-full"
              />
            ) : (
              <div key={i} className="bg-zinc-800 w-full h-full" />
            );
          })}
          {/* Fill empty slots */}
          {Array.from({ length: Math.max(0, 4 - posters.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-zinc-800/60 w-full h-full" />
          ))}
        </div>
      ) : (
        <div className="flex-shrink-0 w-[72px] h-[84px] rounded-lg overflow-hidden bg-zinc-800/80 flex items-center justify-center">
          <List className="h-6 w-6 text-zinc-600" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-2 pt-1">
        <p className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors leading-snug line-clamp-2">
          {listName}
        </p>
        <span className="inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded border tracking-wide uppercase bg-violet-500/10 border-violet-500/20 text-violet-400">
          List
        </span>
        {itemCount != null && (
          <p className="text-[11px] text-zinc-500">{itemCount} {itemCount === 1 ? "item" : "items"}</p>
        )}
      </div>
    </Link>
  );
}

/** Mirrors skeleton's badge: h-5, rounded-full, ~w-20 */
function ActionBadge({ type }: { type: string }) {
  const cfg = ACTION_CONFIG[type];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex h-5 items-center gap-1 px-2.5 rounded-full border text-[11px] font-semibold ${cfg.pill}`}>
      <Icon className="h-3 w-3 flex-shrink-0" />
      {cfg.label}
    </span>
  );
}

/** Mirrors skeleton's action bar: flex gap-3, h-4 icons */
function ActionBar({
  liked, likeCount, bookmarked, onLike, onBookmark, onShare,
}: {
  liked: boolean;
  likeCount: number;
  bookmarked: boolean;
  onLike: (e: React.MouseEvent) => void;
  onBookmark: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex items-center gap-3 -ml-1">
      <button
        onClick={onLike}
        className={`group/b flex items-center gap-1 px-1.5 py-1 rounded-full text-[12px] font-medium transition-colors ${
          liked ? "text-rose-400" : "text-zinc-600 hover:text-rose-400 hover:bg-rose-400/8"
        }`}
        aria-label="Like"
      >
        <Heart className={`h-4 w-4 group-hover/b:scale-110 transition-transform ${liked ? "fill-current" : ""}`} />
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>

      <button
        className="group/b flex items-center gap-1 px-1.5 py-1 rounded-full text-[12px] text-zinc-600 hover:text-sky-400 hover:bg-sky-400/8 transition-colors"
        aria-label="Comment"
      >
        <MessageCircle className="h-4 w-4 group-hover/b:scale-110 transition-transform" />
      </button>

      <button
        onClick={onShare}
        className="group/b flex items-center gap-1 px-1.5 py-1 rounded-full text-[12px] text-zinc-600 hover:text-emerald-400 hover:bg-emerald-400/8 transition-colors"
        aria-label="Share"
      >
        <Share2 className="h-4 w-4 group-hover/b:scale-110 transition-transform" />
      </button>

      <button
        onClick={onBookmark}
        className={`group/b ml-auto flex items-center gap-1 px-1.5 py-1 rounded-full text-[12px] transition-colors ${
          bookmarked ? "text-yellow-400" : "text-zinc-600 hover:text-yellow-400 hover:bg-yellow-400/8"
        }`}
        aria-label="Bookmark"
      >
        <Bookmark className={`h-4 w-4 group-hover/b:scale-110 transition-transform ${bookmarked ? "fill-current" : ""}`} />
      </button>
    </div>
  );
}

// ── FeedPost ──────────────────────────────────────────────────────────────────

export function FeedPost({ activity }: { activity: Activity }) {
  const [liked,      setLiked]      = useState(false);
  const [likeCount,  setLikeCount]  = useState(0);
  const [bookmarked, setBookmarked] = useState(false);

  const avatar  = resolveImage(activity.user?.avatarUrl ?? null);
  const content = activity.data?.content as string | undefined;
  const href    = mediaHref(activity);


  const onLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((prev) => {
      setLikeCount((c) => prev ? Math.max(0, c - 1) : c + 1);
      return !prev;
    });
  };

  const onBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked((prev) => {
      toast.success(prev ? "Removed from saved" : "Saved");
      return !prev;
    });
  };

  const onShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}${href}`)
      .then(() => toast.success("Link copied"))
      .catch(() => {});
  };

  // compact follow variant
  if (activity.type === "follow") {
    return (
      <article className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
        <Link href={`/profile/${activity.user?.username}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 ring-1 ring-white/8">
            {avatar
              ? <Image src={avatar} alt="" width={40} height={40} className="object-cover w-full h-full" unoptimized />
              : <div className="w-full h-full bg-zinc-700" />
            }
          </div>
        </Link>
        <p className="flex-1 min-w-0 text-sm text-zinc-400 truncate">
          <Link href={`/profile/${activity.user?.username}`} className="font-semibold text-zinc-100 hover:underline">
            {activity.user?.displayName ?? activity.user?.username}
          </Link>{" "}
          followed{" "}
          <Link href={`/profile/${activity.data?.username}`} className="font-semibold text-zinc-100 hover:underline">
            {String(activity.data?.username ?? "")}
          </Link>
        </p>
        <span className="text-xs text-zinc-600 flex-shrink-0">{timeAgo(activity.createdAt)}</span>
      </article>
    );
  }

  return (
    <article className="border-b border-white/[0.06] hover:bg-white/[0.015] transition-colors">
      <div className="flex gap-3 px-4 pt-4 pb-3">

        {/* Avatar */}
        <Link href={`/profile/${activity.user?.username}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 ring-1 ring-white/8 hover:ring-purple-500/40 transition-all">
            {avatar
              ? <Image src={avatar} alt="" width={40} height={40} className="object-cover w-full h-full" unoptimized />
              : <div className="w-full h-full bg-gradient-to-br from-zinc-600 to-zinc-800" />
            }
          </div>
        </Link>

        {/* Right column — space-y-3 mirrors skeleton spacing exactly */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Header: Name · @username · time */}
          <div className="flex items-center gap-2 flex-wrap leading-none">
            <Link href={`/profile/${activity.user?.username}`} className="text-[14px] font-bold text-zinc-100 hover:underline truncate max-w-[140px]">
              {activity.user?.displayName ?? activity.user?.username}
            </Link>
            {activity.user?.username && (
              <span className="text-[13px] text-zinc-500 truncate">@{activity.user.username}</span>
            )}
            <span className="text-zinc-700 text-xs">·</span>
            <span className="text-[12px] text-zinc-600">{timeAgo(activity.createdAt)}</span>
          </div>

          {/* Action badge — h-5, rounded-full, matches skeleton block */}
          <ActionBadge type={activity.type} />

          {/* Embed — type-specific card layout */}
          {activity.type === "club" ? (
            <ClubEmbed activity={activity} />
          ) : activity.type === "list" || (activity.type === "like" && activity.targetType === "list") ? (
            <ListEmbed activity={activity} />
          ) : (
            <MediaEmbed activity={activity} />
          )}

          {/* Review text content */}
          {content && activity.type !== "club" && activity.type !== "list" && activity.targetType !== "list" && (
            <p className="text-[14px] text-zinc-300 leading-relaxed line-clamp-4">
              {content}
            </p>
          )}

          {/* Action bar — h-4 icons with gap-3, matches skeleton */}
          <ActionBar
            liked={liked}
            likeCount={likeCount}
            bookmarked={bookmarked}
            onLike={onLike}
            onBookmark={onBookmark}
            onShare={onShare}
          />

        </div>
      </div>
    </article>
  );
}

// ── Skeleton — reference layout, do not change ────────────────────────────────

export function FeedPostSkeleton() {
  return (
    <div className="border-b border-white/[0.06] px-4 pt-4 pb-3 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />

        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-28 bg-zinc-800 rounded-full" />
            <div className="h-3 w-16 bg-zinc-800/60 rounded-full" />
            <div className="h-3 w-6 bg-zinc-800/40 rounded-full" />
          </div>

          {/* Badge */}
          <div className="h-5 w-20 bg-zinc-800/60 rounded-full" />

          {/* Media card */}
          <div className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="w-14 h-[84px] bg-zinc-800 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3.5 w-3/4 bg-zinc-800 rounded-full" />
              <div className="h-3 w-1/4 bg-zinc-800/60 rounded-full" />
              <div className="h-3 w-1/3 bg-zinc-800/40 rounded-full" />
            </div>
          </div>

          {/* Action bar */}
          <div className="flex gap-3">
            <div className="h-4 w-8 bg-zinc-800/40 rounded-full" />
            <div className="h-4 w-8 bg-zinc-800/40 rounded-full" />
            <div className="h-4 w-8 bg-zinc-800/40 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
