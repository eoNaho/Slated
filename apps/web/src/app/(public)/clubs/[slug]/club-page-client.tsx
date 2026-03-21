"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClubHub } from "@/components/clubs/club-hub";
import type { Club, ClubPost, ClubEvent, ClubWatchlistItem, ClubPoll, ClubMember } from "@/lib/queries/clubs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

async function apiFetch<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface ClubPageClientProps {
  slug: string;
}

export function ClubPageClient({ slug }: ClubPageClientProps) {
  const [club, setClub] = useState<Club | null>(null);
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [watchlist, setWatchlist] = useState<ClubWatchlistItem[]>([]);
  const [polls, setPolls] = useState<ClubPoll[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [status, setStatus] = useState<"loading" | "not_found" | "forbidden" | "ok">("loading");

  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_URL}/clubs/${slug}`, {
        credentials: "include",
        cache: "no-store",
      });

      if (res.status === 404) { setStatus("not_found"); return; }
      if (res.status === 403) { setStatus("forbidden"); return; }
      if (!res.ok) { setStatus("not_found"); return; }

      const clubData: { data: Club } = await res.json();
      const clubId = clubData.data.id;

      const [postsRes, eventsRes, watchlistRes, pollsRes, membersRes] = await Promise.all([
        apiFetch<{ data: ClubPost[] }>(`/clubs/${clubId}/posts`),
        apiFetch<{ data: ClubEvent[] }>(`/clubs/${clubId}/events`),
        apiFetch<{ data: ClubWatchlistItem[] }>(`/clubs/${clubId}/watchlist`),
        apiFetch<{ data: ClubPoll[] }>(`/clubs/${clubId}/polls`),
        apiFetch<{ data: ClubMember[] }>(`/clubs/${clubId}/members`),
      ]);

      setClub(clubData.data);
      setPosts(postsRes?.data ?? []);
      setEvents(eventsRes?.data ?? []);
      setWatchlist(watchlistRes?.data ?? []);
      setPolls(pollsRes?.data ?? []);
      setMembers(membersRes?.data ?? []);
      setStatus("ok");
    }
    load();
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-3xl">🔒</div>
        <h1 className="text-xl font-semibold text-white">Club privado</h1>
        <p className="text-zinc-500 text-sm max-w-xs">Você precisa ser membro para ver este club.</p>
      </div>
    );
  }

  if (status === "not_found" || !club) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-3xl">🎬</div>
        <h1 className="text-xl font-semibold text-white">Club não encontrado</h1>
        <p className="text-zinc-500 text-sm max-w-xs">Este club não existe ou foi removido.</p>
        <Link href="/clubs" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
          Ver todos os clubs
        </Link>
      </div>
    );
  }

  return (
    <ClubHub
      club={club}
      posts={posts}
      events={events}
      watchlist={watchlist}
      polls={polls}
      members={members}
    />
  );
}
