import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ProfileTabs } from "./profile-tabs";
import type {
  UserProfile,
  UserStats,
  Review,
  List,
} from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
const AUTH_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:3001";

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
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const userRes = await fetchJson<{ data: any }>(`/users/${username}`);
  if (!userRes?.data) return { title: "Profile — PixelReel" };

  const u = userRes.data;
  const name = u.displayName || u.username;
  const description = u.bio
    ? u.bio.slice(0, 155)
    : `${name}'s film diary on PixelReel. Track, rate and discover films.`;

  return {
    title: `${name} (@${u.username}) — PixelReel`,
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

async function getSessionUsername(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await fetch(`${AUTH_BASE}/api/auth/get-session`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user?.username ?? null;
  } catch {
    return null;
  }
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;

  // Phase 1: user, stats, and session in parallel
  const [userRes, statsRes, sessionUsername] = await Promise.all([
    fetchJson<{ data: any }>(`/users/${username}`),
    fetchJson<{ data: UserStats }>(`/users/${username}/stats`),
    getSessionUsername(),
  ]);

  if (!userRes?.data) notFound();

  const user = userRes.data;

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

  // Phase 2: reviews and lists (need user.id)
  const [reviewsRes, listsRes] = await Promise.all([
    fetchJson<{ data: Review[]; total: number }>(
      `/reviews?user_id=${user.id}&limit=10`,
    ),
    fetchJson<{ data: List[]; total: number }>(
      `/lists?user_id=${user.id}&limit=10`,
    ),
  ]);

  const reviews = reviewsRes?.data ?? [];
  const lists = listsRes?.data ?? [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/20 to-black -z-10" />
      <ProfileTabs
        profile={profile}
        username={username}
        isOwnProfile={isOwnProfile}
        favorites={[]}
        reviews={reviews}
        lists={lists}
      />
    </div>
  );
}
