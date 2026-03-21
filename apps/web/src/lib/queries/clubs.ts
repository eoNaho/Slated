const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

async function fetchJson<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface Club {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  allowJoinRequests: boolean;
  categories: string[];
  memberCount: number;
  maxMembers: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  myRole?: "owner" | "moderator" | "member" | null;
}

export interface ClubPost {
  id: string;
  clubId: string;
  userId: string;
  title: string;
  content: string;
  isPinned: boolean;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  mediaId?: string | null;
  mediaTitle?: string | null;
  user?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface ClubEvent {
  id: string;
  clubId: string;
  title: string;
  description: string | null;
  mediaTitle: string | null;
  mediaPosterPath: string | null;
  scheduledAt: string;
  meetLink: string | null;
  goingCount: number;
  interestedCount: number;
  createdBy: string;
  createdAt: string;
}

export interface ClubWatchlistItem {
  id: string;
  clubId: string;
  mediaId: string | null;
  mediaTitle: string;
  mediaPosterPath: string | null;
  mediaType: string;
  note: string | null;
  isWatched: boolean;
  watchedAt: string | null;
  addedAt: string;
  suggestedBy: string | null;
}

export interface ClubPoll {
  id: string;
  clubId: string;
  question: string;
  totalVotes: number;
  expiresAt: string | null;
  createdAt: string;
  options: {
    id: string;
    text: string;
    mediaId: string | null;
    mediaPosterPath: string | null;
    votesCount: number;
  }[];
  myVote: string | null;
}

export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  role: "owner" | "moderator" | "member";
  joinedAt: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export async function getPublicClubs(params?: {
  page?: number;
  category?: string;
  search?: string;
}): Promise<{
  data: Club[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
} | null> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.category) qs.set("category", params.category);
  if (params?.search) qs.set("search", params.search);
  return fetchJson(`/clubs?${qs}`);
}

export async function getClub(slug: string): Promise<{ data: Club } | null> {
  return fetchJson(`/clubs/${slug}`);
}

export async function getClubPosts(slug: string): Promise<{ data: ClubPost[] } | null> {
  return fetchJson(`/clubs/${slug}/posts`);
}

export async function getClubEvents(slug: string): Promise<{ data: ClubEvent[] } | null> {
  return fetchJson(`/clubs/${slug}/events`);
}

export async function getClubWatchlist(slug: string): Promise<{ data: ClubWatchlistItem[] } | null> {
  return fetchJson(`/clubs/${slug}/watchlist`);
}

export async function getClubPolls(slug: string): Promise<{ data: ClubPoll[] } | null> {
  return fetchJson(`/clubs/${slug}/polls`);
}

export async function getClubMembers(slug: string): Promise<{ data: ClubMember[] } | null> {
  return fetchJson(`/clubs/${slug}/members`);
}
