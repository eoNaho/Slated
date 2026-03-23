import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ProfileTabs } from "./profile-tabs";
import type {
  UserProfile,
  UserStats,
  Review,
  List,
  CurrentActivity,
  Scrobble,
  Activity,
  DiaryEntry,
  WatchlistItem,
  UserIdentity,
  LikeItem,
} from "@/types";
import type { Story } from "@/types/stories";
import type { StoryHighlight } from "@/lib/api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
const AUTH_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "http://localhost:3001";

async function fetchJson<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      next: { revalidate: 60 },
      ...options,
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const userRes = await fetchJson<{ data: UserProfile }>(`/users/${username}`);
  if (!userRes?.data) return { title: "Profile — PixelReel" };

  const u = userRes.data;
  const name = u.displayName || u.username;
  const description = u.bio
    ? u.bio.slice(0, 155)
    : `${name}'s film diary on PixelReel. Track, rate and discover films.`;

  return {
    title: `${name} (@${u.username})`,
    description,
    openGraph: {
      title: `${name} on PixelReel`,
      description,
      type: "profile",
      username: u.username,
      images: u.avatarUrl
        ? [{ url: u.avatarUrl, width: 400, height: 400, alt: name }]
        : [],
    },
    twitter: {
      card: "summary",
      title: `${name} on PixelReel`,
      description,
      images: u.avatarUrl ? [u.avatarUrl] : [],
    },
  };
}

async function getSessionInfo(): Promise<{
  username: string | null;
  userId: string | null;
  cookieHeader: string;
}> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await fetch(`${AUTH_BASE}/api/auth/get-session`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return { username: null, userId: null, cookieHeader };
    const data = await res.json();
    return {
      username: data?.user?.username ?? null,
      userId: data?.user?.id ?? null,
      cookieHeader,
    };
  } catch {
    return { username: null, userId: null, cookieHeader: "" };
  }
}

async function fetchJsonAuth<T>(
  endpoint: string,
  cookieHeader: string,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  const initialTab = typeof resolvedSearchParams.tab === "string" ? resolvedSearchParams.tab : undefined;

  // Phase 1: session first, then user+stats in parallel with auth cookies
  const sessionInfo = await getSessionInfo();
  const {
    username: sessionUsername,
    userId: sessionUserId,
    cookieHeader,
  } = sessionInfo;

  const [userRes, statsRes] = await Promise.all([
    fetchJsonAuth<{ data: UserProfile & { isFollowing?: boolean } }>(
      `/users/${username}`,
      cookieHeader,
    ),
    fetchJson<{ data: UserStats }>(`/users/${username}/stats`),
  ]);

  if (!userRes?.data) notFound();

  const user = userRes.data;

  // Phase 1.5: activity and scrobbles (need user.id)
  const [activityNowRes, scrobblesRes, activitiesRes] = await Promise.all([
    fetchJson<{ data: CurrentActivity | null }>(`/activity/now/${user.id}`),
    fetchJson<{ data: Scrobble[]; total: number }>(
      `/activity/scrobbles/${user.id}?limit=20`,
    ),
    fetchJson<{ data: Activity[]; total: number }>(
      `/feed/user/${user.id}?limit=20`,
    ),
  ]);

  const stats: UserStats = statsRes?.data ?? {
    userId: user.id,
    moviesWatched: 0,
    seriesWatched: 0,
    watchTimeMins: 0,
    reviewsCount: 0,
    listsCount: 0,
    followersCount: 0,
    followingCount: 0,
    xp: 0,
    level: 1,
  };

  const profile: UserProfile = { ...user, stats };
  const isOwnProfile = sessionUsername === username;
  const initialIsFollowing =
    !isOwnProfile && !!sessionUserId && !!(userRes.data as any).isFollowing;

  // Phase 2: reviews, lists, stories, identity (public) + diary/watchlist for own profile
  const [
    reviewsRes,
    listsRes,
    storiesRes,
    highlightsRes,
    identityRes,
    diaryRes,
    watchlistRes,
    likesRes,
  ] = await Promise.all([
    fetchJson<{ data: Review[]; total: number }>(
      `/reviews?user_id=${user.id}&limit=10`,
    ),
    fetchJson<{ data: List[]; total: number }>(
      `/lists?user_id=${user.id}&limit=10`,
    ),
    fetchJson<{ data: Story[] }>(`/stories/user/${username}`),
    fetchJson<{ data: StoryHighlight[] }>(`/story-highlights/user/${username}`),
    fetchJson<{ data: UserIdentity }>(`/identity/${username}`),
    isOwnProfile
      ? fetchJsonAuth<{ data: DiaryEntry[] }>("/diary", cookieHeader)
      : Promise.resolve(null),
    isOwnProfile
      ? fetchJsonAuth<{ data: WatchlistItem[] }>("/watchlist", cookieHeader)
      : Promise.resolve(null),
    fetchJson<{
      data: Array<{
        id: string;
        createdAt: string;
        media: {
          id: string;
          title: string;
          slug: string;
          posterPath: string | null;
          type: string;
          releaseDate: string | null;
        };
      }>;
    }>(`/likes/media/user/${user.id}?limit=24`),
  ]);

  const reviews = reviewsRes?.data ?? [];
  const lists = listsRes?.data ?? [];
  const stories = storiesRes?.data ?? [];
  const highlights = highlightsRes?.data ?? [];
  const identity = identityRes?.data ?? null;
  const activity = activitiesRes?.data ?? [];
  const diary = diaryRes?.data ?? [];
  const watchlist = watchlistRes?.data ?? [];
  const likes = (likesRes?.data ?? []).map((r) => ({
    id: r.id,
    userId: user.id,
    mediaId: r.media.id,
    likedAt: r.createdAt,
    createdAt: r.createdAt,
    media: {
      id: r.media.id,
      title: r.media.title,
      slug: r.media.slug,
      posterPath: r.media.posterPath,
      type: r.media.type as "movie" | "series",
      year: r.media.releaseDate
        ? new Date(r.media.releaseDate).getFullYear()
        : undefined,
    },
  })) as LikeItem[];

  const favoritesData = likes.slice(0, 4).map((like) => ({
    id: like.media.id,
    title: like.media.title,
    posterPath: like.media.posterPath || "",
    year: like.media.year || 0,
    slug: like.media.slug,
    mediaType: like.media.type,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/20 to-black -z-10" />
      <ProfileTabs
        profile={profile}
        username={username}
        isOwnProfile={isOwnProfile}
        currentUserId={sessionUserId ?? undefined}
        initialIsFollowing={initialIsFollowing}
        favorites={favoritesData}
        likes={likes}
        reviews={reviews}
        lists={lists}
        stories={stories}
        highlights={highlights}
        identity={identity}
        diary={diary}
        watchlist={watchlist}
        watchingNow={activityNowRes?.data}
        scrobbles={scrobblesRes?.data || []}
        activity={activity}
        initialTab={initialTab}
      />
    </div>
  );
}
