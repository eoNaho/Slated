"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Users2, RefreshCw, Film, Compass } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import {
  useInfinitePersonalFeed,
  useInfiniteGlobalFeed,
} from "@/hooks/queries/use-feed";
import { useMediaRecommendations } from "@/hooks/queries/use-recommendations";
import { FeedPost, FeedPostSkeleton } from "@/components/feed/feed-post";
import { FeedSidebar } from "@/components/feed/feed-sidebar";
import { RecommendedMediaCard } from "@/components/media/recommended-media-card";
import Link from "next/link";
import type { Activity } from "@/types";

// ── empty states ──────────────────────────────────────────────────────────────

function EmptyForYou() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-5">
        <Sparkles className="h-7 w-7 text-zinc-600" />
      </div>
      <p className="text-zinc-300 font-semibold text-lg">Nothing here yet</p>
      <p className="text-sm text-zinc-500 mt-2 max-w-xs leading-relaxed">
        Explore movies and follow people to start seeing activity in your feed.
      </p>
      <Link
        href="/discover"
        className="mt-5 inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
      >
        <Compass className="h-4 w-4" />
        Explore movies
      </Link>
    </div>
  );
}

function EmptyFollowing({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-5">
          <Users2 className="h-7 w-7 text-zinc-600" />
        </div>
        <p className="text-zinc-300 font-semibold text-lg">Sign in to see your feed</p>
        <p className="text-sm text-zinc-500 mt-2 max-w-xs leading-relaxed">
          Follow people to see their activity here.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-1.5 text-sm bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-full transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-5">
        <Film className="h-7 w-7 text-zinc-600" />
      </div>
      <p className="text-zinc-300 font-semibold text-lg">No activity from people you follow</p>
      <p className="text-sm text-zinc-500 mt-2 max-w-xs leading-relaxed">
        When they watch or review something, it shows up here.
      </p>
      <Link
        href="/discover/users"
        className="mt-5 inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
      >
        <Users2 className="h-4 w-4" />
        Find people to follow
      </Link>
    </div>
  );
}

// ── sentinel for infinite scroll ──────────────────────────────────────────────

function InfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  count,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  count: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div ref={ref} className="py-6 flex justify-center">
      {isFetchingNextPage ? (
        <RefreshCw className="h-4 w-4 text-zinc-600 animate-spin" />
      ) : !hasNextPage && count > 0 ? (
        <p className="text-xs text-zinc-700">You&apos;re all caught up ✓</p>
      ) : null}
    </div>
  );
}

// ── For You tab ───────────────────────────────────────────────────────────────

function ForYouFeed() {
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteGlobalFeed(true);

  const { data: recsData } = useMediaRecommendations(
    { limit: 10, includeScores: false },
    true,
  );

  const activities: Activity[] = (data?.pages ?? []).flatMap(
    (p) => p.data ?? [],
  );
  const recs = recsData?.data ?? [];

  if (isLoading) {
    return (
      <>
        {Array.from({ length: 6 }).map((_, i) => (
          <FeedPostSkeleton key={i} />
        ))}
      </>
    );
  }

  if (!activities.length && !recs.length) return <EmptyForYou />;

  type FeedItem =
    | { kind: "activity"; data: Activity; key: string }
    | { kind: "rec"; data: (typeof recs)[number]; key: string };

  const items: FeedItem[] = [];
  let recIdx = 0;
  activities.forEach((act, i) => {
    items.push({ kind: "activity", data: act, key: act.id });
    if ((i + 1) % 7 === 0 && recIdx < recs.length) {
      const rec = recs[recIdx++];
      items.push({ kind: "rec", data: rec, key: `rec-${rec.localId ?? rec.id}-${i}` });
    }
  });

  const itemId = (m: { localId?: string | null; id?: string | number }) =>
    String(m.localId ?? m.id ?? "");

  return (
    <>
      {items.map((item) =>
        item.kind === "activity" ? (
          <FeedPost key={item.key} activity={item.data} />
        ) : (
          <div
            key={item.key}
            className="border-b border-white/[0.06] px-4 py-4 bg-gradient-to-r from-purple-950/20 to-transparent"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-400/80 mb-3 uppercase tracking-wide">
              <Sparkles className="h-3 w-3" />
              Recommended for you
            </p>
            <RecommendedMediaCard media={item.data} compact />
          </div>
        ),
      )}

      <InfiniteScrollSentinel
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        count={activities.length}
      />
    </>
  );
}

// ── Following tab ─────────────────────────────────────────────────────────────

function FollowingFeed({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfinitePersonalFeed(isLoggedIn);

  const activities: Activity[] = (data?.pages ?? []).flatMap(
    (p) => p.data ?? [],
  );

  if (!isLoggedIn) return <EmptyFollowing isLoggedIn={false} />;

  if (isLoading) {
    return (
      <>
        {Array.from({ length: 6 }).map((_, i) => (
          <FeedPostSkeleton key={i} />
        ))}
      </>
    );
  }

  if (!activities.length) return <EmptyFollowing isLoggedIn />;

  return (
    <>
      {activities.map((act) => (
        <FeedPost key={act.id} activity={act} />
      ))}
      <InfiniteScrollSentinel
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        count={activities.length}
      />
    </>
  );
}

// ── tab bar ───────────────────────────────────────────────────────────────────

type Tab = "for-you" | "following";

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="flex border-b border-white/[0.06] bg-black/20 backdrop-blur-sm sticky top-16 z-10">
      {(
        [
          { id: "for-you",    label: "For You",   icon: Sparkles },
          { id: "following",  label: "Following",  icon: Users2   },
        ] as const
      ).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`relative flex-1 py-3.5 text-sm font-semibold transition-colors ${
            tab === id
              ? "text-white"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </span>
          {tab === id && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-0.5 bg-purple-500 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const [tab, setTab] = useState<Tab>("for-you");
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-0">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,600px)_320px] gap-8 max-w-5xl mx-auto">
          {/* Feed column */}
          <main className="border-x border-white/[0.06] min-h-screen">
            <TabBar tab={tab} setTab={setTab} />

            {tab === "for-you" ? (
              <ForYouFeed />
            ) : (
              <FollowingFeed isLoggedIn={isLoggedIn} />
            )}
          </main>

          {/* Sidebar */}
          <div className="hidden lg:block pt-6">
            <FeedSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
