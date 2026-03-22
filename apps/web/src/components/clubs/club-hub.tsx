"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Users,
  MessageSquare,
  Calendar,
  Bookmark,
  BarChart2,
  Globe,
  Lock,
  Crown,
  Shield,
  ChevronLeft,
  Clock,
  CheckCircle2,
  Film,
  Video,
  ExternalLink,
  Pin,
  Settings,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  ChevronUp,
  ChevronDown,
  Loader2,
  Plus,
  Trash2,
  Star,
  X,
  Send,
  PinOff,
  Pencil,
  Check,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { resolveImage } from "@/lib/utils";
import type {
  Club,
  ClubPost,
  ClubEvent,
  ClubWatchlistItem,
  ClubPoll,
  ClubMember,
} from "@/lib/queries/clubs";
import { MediaSearchInput } from "@/components/media/media-search-input";
import type { SearchResult } from "@/types";
import { 
  ClubInfoWidget, 
  NextSessionWidget, 
  TopPollWidget, 
  WatchlistSpotlightWidget 
} from "./sidebar-widgets";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

async function apiFetch(endpoint: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...opts,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

const ROLE_BADGE = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "text-purple-300 bg-purple-400/10 border-purple-400/25",
  },
  moderator: {
    label: "Mod",
    icon: Shield,
    color: "text-indigo-300 bg-indigo-400/10 border-indigo-400/25",
  },
  member: {
    label: "Member",
    icon: Users,
    color: "text-zinc-400 bg-zinc-400/8 border-zinc-600/30",
  },
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  action: "Action",
  comedy: "Comedy",
  drama: "Drama",
  horror: "Horror",
  "sci-fi": "Sci-Fi",
  thriller: "Thriller",
  romance: "Romance",
  crime: "Crime",
  fantasy: "Fantasy",
  mystery: "Mystery",
  animation: "Animation",
  anime: "Anime",
  documentary: "Documentary",
  musical: "Musical",
  "by-director": "By Director",
  "by-actor": "By Actor",
  "by-decade": "By Decade",
  "by-country": "By Country",
  general: "General",
};

const BASE_TABS = [
  { value: "posts", label: "Discussions", icon: MessageSquare },
  { value: "events", label: "Sessions", icon: Calendar },
  { value: "watchlist", label: "Watchlist", icon: Bookmark },
  { value: "polls", label: "Polls", icon: BarChart2 },
  { value: "members", label: "Members", icon: Users },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Avatar({
  src,
  name,
  size = "sm",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "w-9 h-9" : "w-7 h-7";
  const text = size === "md" ? "text-sm" : "text-xs";
  return (
    <div
      className={`relative ${dim} rounded-full shrink-0 overflow-hidden ring-1 ring-white/8`}
    >
      {src ? (
        <Image fill src={resolveImage(src)!} alt={name} className="object-cover" />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center ${text} font-black text-white`}
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
        >
          {name[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="py-12 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 mb-4">
        <Icon className="h-5 w-5 text-zinc-600" />
      </div>
      <p className="text-zinc-500 text-xs font-medium">{text}</p>
    </div>
  );
}

// ─── Input / Textarea shared styles ────────────────────────────────────────────
const inputCls =
  "w-full bg-zinc-900/50 border border-white/5 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 transition-all rounded-xl backdrop-blur-md";
const btnPrimaryCls =
  "group relative flex items-center justify-center gap-2 px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40";
const btnGhostCls =
  "px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-200 border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all rounded-xl backdrop-blur-md";

// ─── Main ─────────────────────────────────────────────────────────────────────

export interface ClubHubProps {
  club: Club;
  posts: ClubPost[];
  events: ClubEvent[];
  watchlist: ClubWatchlistItem[];
  polls: ClubPoll[];
  members: ClubMember[];
}

export function ClubHub({
  club,
  posts: initialPosts,
  events: initialEvents,
  watchlist: initialWatchlist,
  polls: initialPolls,
  members: initialMembers,
}: ClubHubProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("posts");
  const [joinLoading, setJoinLoading] = useState(false);
  const [myRole, setMyRole] = useState<string | null>(club.myRole ?? null);

  // Stateful content
  const [posts, setPosts] = useState<any[]>(initialPosts);
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [polls, setPolls] = useState(initialPolls);
  const [members, setMembers] = useState(initialMembers);

  // Posts state
  const [showPostForm, setShowPostForm] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [commentsLoaded, setCommentsLoaded] = useState<Record<string, boolean>>(
    {},
  );
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostContent, setEditPostContent] = useState("");

  // Events state
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    eventType: "watch" as "watch" | "discussion",
    media: null as Pick<
      SearchResult,
      "id" | "title" | "posterPath" | "mediaType" | "localId"
    > | null,
    scheduledAt: "",
    meetLink: "",
  });
  const [eventLoading, setEventLoading] = useState(false);

  // Watchlist state
  const [showWatchlistForm, setShowWatchlistForm] = useState(false);
  const [newWatchlist, setNewWatchlist] = useState({
    media: null as Pick<
      SearchResult,
      "id" | "title" | "posterPath" | "mediaType" | "localId"
    > | null,
    note: "",
  });
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Polls state
  const [showPollForm, setShowPollForm] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);
  const [newPollExpiry, setNewPollExpiry] = useState("");
  const [pollCreateLoading, setPollCreateLoading] = useState(false);

  // Manage tab state
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [joinReqLoaded, setJoinReqLoaded] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const isMember = !!myRole;
  const isAdmin = myRole === "owner" || myRole === "moderator";

  // ── FIX: tabCounts was referenced but never defined ──────────────────────────
  const tabCounts: Record<string, number> = {
    posts: posts.length,
    events: events.length,
    watchlist: watchlist.length,
    polls: polls.length,
    members: members.length,
    manage: joinRequests.length,
  };

  const TABS = [
    ...BASE_TABS,
    ...(isAdmin ? [{ value: "manage", label: "Manage", icon: Settings }] : []),
  ];

  // ── Join/Leave ──────────────────────────────────────────────────────────────

  async function handleJoin() {
    if (!session?.user) {
      toast.error("Faça login para entrar no club");
      router.push("/sign-in");
      return;
    }
    setJoinLoading(true);
    try {
      if (club.allowJoinRequests && !club.isPublic) {
        await apiFetch(`/clubs/${club.id}/join-request`, { method: "POST" });
        toast.success("Request sent! Awaiting approval.");
      } else {
        await apiFetch(`/clubs/${club.id}/join`, { method: "POST" });
        toast.success("Joined the club!");
        setMyRole("member");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleLeave() {
    if (!confirm("Are you sure you want to leave the club?")) return;
    try {
      await apiFetch(`/clubs/${club.id}/leave`, { method: "DELETE" });
      toast.success("You left the club.");
      setMyRole(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  // ── Posts ───────────────────────────────────────────────────────────────────

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;
    setPostLoading(true);
    try {
      const data = await apiFetch(`/clubs/${club.id}/posts`, {
        method: "POST",
        body: JSON.stringify({ title: postTitle, content: postContent }),
      });
      const newPost = {
        ...data.data,
        user: {
          id: session?.user?.id,
          username: session?.user?.name,
          displayName: session?.user?.name,
          avatarUrl: session?.user?.image,
        },
        commentsCount: 0,
      };
      setPosts((prev) => [newPost, ...prev]);
      setPostTitle("");
      setPostContent("");
      setShowPostForm(false);
      toast.success("Discussion created!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setPostLoading(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Delete this discussion?")) return;
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Discussion deleted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function handlePinPost(postId: string, pinned: boolean) {
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}/pin`, {
        method: "POST",
        body: JSON.stringify({ pinned }),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isPinned: pinned } : p)),
      );
      toast.success(pinned ? "Pinned!" : "Unpinned.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleSaveEditPost(postId: string) {
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editPostTitle,
          content: editPostContent,
        }),
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, title: editPostTitle, content: editPostContent }
            : p,
        ),
      );
      setEditingPost(null);
      toast.success("Discussion updated.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function togglePost(postId: string) {
    if (expandedPost === postId) {
      setExpandedPost(null);
      return;
    }
    setExpandedPost(postId);
    if (!commentsLoaded[postId]) {
      try {
        const data = await apiFetch(
          `/clubs/${club.id}/posts/${postId}/comments`,
        );
        setPostComments((prev) => ({ ...prev, [postId]: data.data ?? [] }));
        setCommentsLoaded((prev) => ({ ...prev, [postId]: true }));
      } catch {
        setCommentsLoaded((prev) => ({ ...prev, [postId]: true }));
      }
    }
  }

  async function handleAddComment(postId: string) {
    const content = (commentInput[postId] ?? "").trim();
    if (!content) return;
    try {
      const data = await apiFetch(
        `/clubs/${club.id}/posts/${postId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        },
      );
      const newComment = {
        ...data.data,
        author: {
          id: session?.user?.id,
          username: session?.user?.name,
          displayName: session?.user?.name,
          avatarUrl: session?.user?.image,
        },
      };
      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), newComment],
      }));
      setCommentInput((prev) => ({ ...prev, [postId]: "" }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 }
            : p,
        ),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleDeleteComment(postId: string, commentId: string) {
    try {
      await apiFetch(
        `/clubs/${club.id}/posts/${postId}/comments/${commentId}`,
        { method: "DELETE" },
      );
      setPostComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((c) => c.id !== commentId),
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, commentsCount: Math.max(0, (p.commentsCount ?? 0) - 1) }
            : p,
        ),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.scheduledAt) return;
    setEventLoading(true);
    try {
      const data = await apiFetch(`/clubs/${club.id}/events`, {
        method: "POST",
        body: JSON.stringify({
          title: newEvent.title,
          description: newEvent.description || undefined,
          eventType: newEvent.eventType,
          scheduledAt: newEvent.scheduledAt,
          meetLink: newEvent.meetLink || undefined,
          mediaId: newEvent.media?.localId || undefined,
          mediaTitle: newEvent.media?.title,
          mediaPosterPath: newEvent.media?.posterPath,
        }),
      });
      setEvents((prev) => [
        ...prev,
        { ...data.data, goingCount: 0, interestedCount: 0, myRsvp: null },
      ]);
      setNewEvent({
        title: "",
        description: "",
        eventType: "watch",
        media: null,
        scheduledAt: "",
        meetLink: "",
      });
      setShowEventForm(false);
      toast.success("Session created!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setEventLoading(false);
    }
  }

  async function handleRsvp(
    eventId: string,
    status: "going" | "interested" | "not_going",
  ) {
    try {
      await apiFetch(`/clubs/${club.id}/events/${eventId}/rsvp`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          const old = e.myRsvp;
          return {
            ...e,
            myRsvp: status,
            goingCount:
              e.goingCount +
              (status === "going" ? 1 : 0) -
              (old === "going" ? 1 : 0),
            interestedCount:
              e.interestedCount +
              (status === "interested" ? 1 : 0) -
              (old === "interested" ? 1 : 0),
          };
        }),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Delete this session?")) return;
    try {
      await apiFetch(`/clubs/${club.id}/events/${eventId}`, {
        method: "DELETE",
      });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success("Session deleted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  // ── Watchlist ───────────────────────────────────────────────────────────────

  async function handleAddWatchlistItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newWatchlist.media) {
      toast.error("Please select a movie or series.");
      return;
    }
    setWatchlistLoading(true);
    try {
      const data = await apiFetch(`/clubs/${club.id}/watchlist`, {
        method: "POST",
        body: JSON.stringify({
          mediaId: newWatchlist.media.localId || undefined,
          mediaTitle: newWatchlist.media.title,
          mediaPosterPath: newWatchlist.media.posterPath,
          mediaType: newWatchlist.media.mediaType,
          note: newWatchlist.note || undefined,
        }),
      });
      setWatchlist((prev) => [...prev, data.data]);
      setNewWatchlist({ media: null, note: "" });
      setShowWatchlistForm(false);
      toast.success("Added to watchlist!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setWatchlistLoading(false);
    }
  }

  async function handleToggleWatched(itemId: string, isWatched: boolean) {
    try {
      await apiFetch(`/clubs/${club.id}/watchlist/${itemId}/watched`, {
        method: "PATCH",
        body: JSON.stringify({ isWatched }),
      });
      setWatchlist((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, isWatched } : i)),
      );
      toast.success(isWatched ? "Marcado como assistido!" : "Desmarcado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function handleRemoveWatchlistItem(itemId: string) {
    try {
      await apiFetch(`/clubs/${club.id}/watchlist/${itemId}`, {
        method: "DELETE",
      });
      setWatchlist((prev) => prev.filter((i) => i.id !== itemId));
      toast.success("Removido da watchlist.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  // ── Polls ───────────────────────────────────────────────────────────────────

  async function handleVote(pollId: string, optionId: string) {
    if (!session?.user) {
      toast.error("Faça login para votar");
      return;
    }
    try {
      await apiFetch(`/clubs/${club.id}/polls/${pollId}/vote`, {
        method: "POST",
        body: JSON.stringify({ optionId }),
      });
      setPolls((prev) =>
        prev.map((p) =>
          p.id === pollId
            ? {
                ...p,
                myVote: optionId,
                totalVotes: p.myVote ? p.totalVotes : p.totalVotes + 1,
                options: p.options.map((o) =>
                  o.id === optionId
                    ? { ...o, votesCount: o.votesCount + 1 }
                    : o,
                ),
              }
            : p,
        ),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function handleCreatePoll(e: React.FormEvent) {
    e.preventDefault();
    const opts = newPollOptions.filter((o) => o.trim());
    if (!newPollQuestion.trim() || opts.length < 2) {
      toast.error("Pergunta e mínimo 2 opções são obrigatórias.");
      return;
    }
    setPollCreateLoading(true);
    try {
      const data = await apiFetch(`/clubs/${club.id}/polls`, {
        method: "POST",
        body: JSON.stringify({
          question: newPollQuestion,
          expiresAt: newPollExpiry || undefined,
          options: opts.map((text) => ({ text })),
        }),
      });
      setPolls((prev) => [
        {
          ...data.data,
          myVote: null,
          totalVotes: 0,
          options: (data.data.options ?? []).map((o: any) => ({
            ...o,
            votesCount: 0,
          })),
        },
        ...prev,
      ]);
      setNewPollQuestion("");
      setNewPollOptions(["", ""]);
      setNewPollExpiry("");
      setShowPollForm(false);
      toast.success("Votação criada!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setPollCreateLoading(false);
    }
  }

  // ── Manage ──────────────────────────────────────────────────────────────────

  async function loadJoinRequests() {
    if (joinReqLoaded) return;
    try {
      const data = await apiFetch(`/clubs/${club.id}/requests`);
      setJoinRequests(data.data ?? []);
    } catch {
      /**/
    } finally {
      setJoinReqLoaded(true);
    }
  }

  async function handleAcceptRequest(requestId: string) {
    try {
      await apiFetch(`/clubs/${club.id}/requests/${requestId}/accept`, {
        method: "POST",
      });
      setJoinRequests((prev) => prev.filter((r) => r.request.id !== requestId));
      toast.success("Solicitação aceita!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function handleRejectRequest(requestId: string) {
    try {
      await apiFetch(`/clubs/${club.id}/requests/${requestId}/reject`, {
        method: "POST",
      });
      setJoinRequests((prev) => prev.filter((r) => r.request.id !== requestId));
      toast.success("Solicitação rejeitada.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function handleKick(userId: string) {
    if (!confirm("Remover este membro do club?")) return;
    try {
      await apiFetch(`/clubs/${club.id}/members/${userId}`, {
        method: "DELETE",
      });
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.success("Membro removido.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function handleSetRole(
    userId: string,
    newRole: "moderator" | "member",
  ) {
    try {
      await apiFetch(`/clubs/${club.id}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)),
      );
      toast.success(
        newRole === "moderator"
          ? "Promovido a moderador."
          : "Rebaixado a membro.",
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  // ── FIX: handleInvite was called but never defined ───────────────────────────
  async function handleInvite() {
    if (!inviteInput.trim()) return;
    setInviteLoading(true);
    try {
      await apiFetch(`/clubs/${club.id}/invite`, {
        method: "POST",
        body: JSON.stringify({ username: inviteInput.replace(/^@/, "") }),
      });
      toast.success("Convite enviado!");
      setInviteInput("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setInviteLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 selection:bg-purple-500/30 selection:text-purple-100 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/5 to-black -z-10" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Banner */}
        <div className="relative h-64 lg:h-80 w-full overflow-hidden bg-zinc-950">
          {club.coverUrl ? (
            <Image
              fill
              src={club.coverUrl}
              alt={club.name}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-zinc-900 via-purple-950/40 to-black">
              {/* Artistic Grid */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                  backgroundSize: "60px 60px",
                }}
              />
              {/* Dynamic Glows */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
            </div>
          )}
          {/* Cinematic Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Profile Content */}
        <div className="container mx-auto px-6 relative z-10 -mt-24 lg:-mt-28">
          <Link
            href="/clubs"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-purple-400 transition-all mb-8 group"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Clubs
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-center md:items-end">
            {/* Avatar */}
            <div className="relative shrink-0 group">
              <div className="absolute -inset-4 bg-purple-500/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative w-36 h-36 lg:w-40 lg:h-40 rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
                <div
                  className="w-full h-full flex items-center justify-center text-7xl font-black text-white bg-gradient-to-br from-purple-500 to-indigo-600"
                  style={{ textShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
                >
                  {club.name[0]?.toUpperCase() ?? "?"}
                </div>
                {/* Micro scanlines */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#fff_2px,#fff_3px)]" />
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-6">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <span
                      className={`inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl border backdrop-blur-md ${
                        club.isPublic
                          ? "text-zinc-400 border-white/5 bg-white/5"
                          : "text-purple-400 border-purple-500/20 bg-purple-500/10"
                      }`}
                    >
                      {club.isPublic ? (
                        <Globe className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      {club.isPublic ? "Public" : "Private"}
                    </span>
                    {club.categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-3 py-1.5 rounded-xl border border-white/5 bg-zinc-900/50"
                      >
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                    ))}
                  </div>

                  <h1
                    className="text-4xl lg:text-5xl font-black text-white leading-[1.2] tracking-tight mb-4"
                    style={{ textShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
                  >
                    {club.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Founder */}
                    <div className="h-10 px-4 flex items-center gap-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md group/founder transition-all hover:bg-white/[0.08]">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                        Founded by
                      </span>
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={club.owner.avatarUrl}
                          name={
                            club.owner.displayName ?? club.owner.username ?? "?"
                          }
                          size="sm"
                        />
                        <Link
                          href={`/profile/${club.owner.username}`}
                          className="text-sm font-bold text-zinc-300 hover:text-purple-400 transition-colors"
                        >
                          {club.owner.displayName ?? club.owner.username}
                        </Link>
                      </div>
                    </div>

                    {/* Stats Group */}
                    <div className="flex items-center gap-8 py-1">
                      {[
                        { value: club.memberCount, label: "Members" },
                        { value: posts.length, label: "Discussions" },
                        { value: events.length, label: "Sessions" },
                      ].map(({ value, label }) => (
                        <div key={label} className="group/stat cursor-default">
                          <div className="text-lg font-black text-white tabular-nums group-hover/stat:text-purple-400 transition-colors tracking-tight">
                            {value}
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-600 group-hover/stat:text-zinc-500 transition-colors">
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0 pb-1">
                  {isMember ? (
                    <>
                      {myRole &&
                        (() => {
                          const badge =
                            ROLE_BADGE[myRole as keyof typeof ROLE_BADGE] ??
                            ROLE_BADGE.member;
                          const BadgeIcon = badge.icon;
                          return (
                            <div
                              className={`h-10 px-5 flex items-center gap-2 rounded-xl border backdrop-blur-md shadow-xl transition-transform hover:scale-105 ${badge.color}`}
                            >
                              <BadgeIcon className="h-4 w-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-inherit">
                                {badge.label}
                              </span>
                            </div>
                          );
                        })()}
                      {isAdmin && (
                        <Link
                          href={`/clubs/${club.slug}/settings`}
                          className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all shadow-xl hover:scale-105 active:scale-95"
                        >
                          <Settings className="h-3.5 w-3.5" /> Settings
                        </Link>
                      )}
                      {myRole !== "owner" && (
                        <button
                          onClick={handleLeave}
                          className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-zinc-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                        >
                          Leave
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={handleJoin}
                      disabled={
                        joinLoading ||
                        (!club.isPublic && !club.allowJoinRequests)
                      }
                      className="group relative h-11 px-8 rounded-xl overflow-hidden shadow-2xl transition-all hover:scale-[1.05] active:scale-[0.98] disabled:opacity-40"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:from-purple-500 group-hover:to-indigo-500" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                        {joinLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : club.isPublic ? (
                          <>
                            Join Club{" "}
                            <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
                          </>
                        ) : club.allowJoinRequests ? (
                          "Request to Join"
                        ) : (
                          <>
                            <Lock className="h-3 w-3" /> Club Locked
                          </>
                        )}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {club.description && (
                <p className="text-zinc-400 text-sm leading-relaxed font-bold max-w-2xl opacity-80">
                  {club.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ────────────────────────────────────────────────── */}
      <div className="sticky top-14 z-20 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-6">
          <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1 py-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const cnt = tabCounts[tab.value];
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setActiveTab(tab.value);
                    if (tab.value === "manage") loadJoinRequests();
                  }}
                  className={`group relative flex items-center gap-2.5 px-5 py-3.5 transition-all duration-300 ${isActive ? "text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 transition-transform group-hover:scale-110 ${isActive ? "text-purple-400" : "text-zinc-500 group-hover:text-zinc-400"}`}
                  />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {tab.label}
                  </span>
                  {cnt > 0 && (
                    <span
                      className={`text-[9px] font-black tabular-nums px-2 py-0.5 rounded-full border ${isActive ? "text-purple-400 border-purple-500/30 bg-purple-500/10" : "text-zinc-600 border-white/5 bg-zinc-900"}`}
                    >
                      {cnt}
                    </span>
                  )}
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Content (Tabs) */}
          <div className="lg:col-span-8 space-y-8">
        {/* ── Posts ─────────────────────────────────────────────────────── */}
        {activeTab === "posts" && (
          <div className="max-w-2xl space-y-3">
            {isMember && (
              <div className="mb-6">
                {!showPostForm ? (
                  <button
                    onClick={() => setShowPostForm(true)}
                    className="group relative flex items-center gap-4 w-full text-left px-6 py-5 rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all text-sm font-medium overflow-hidden backdrop-blur-md"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 border border-purple-500/20 transition-all">
                      <Plus className="h-5 w-5 text-purple-400" />
                    </div>
                    <span className="relative z-10 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      Start a discussion...
                    </span>
                  </button>
                ) : (
                  <div
                    className="rounded-2xl border border-white/5 overflow-hidden transition-all duration-300 shadow-2xl"
                    style={{
                      background: "rgba(24,24,27,0.6)",
                      backdropFilter: "blur(20px)",
                    }}
                  >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                        New Discussion
                      </span>
                      <button
                        onClick={() => setShowPostForm(false)}
                        className="text-zinc-600 hover:text-zinc-400 transition-colors p-0.5 rounded-md hover:bg-white/5"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <form onSubmit={handleCreatePost} className="p-5 space-y-3">
                      <input
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        required
                        minLength={3}
                        maxLength={150}
                        placeholder="Discussion Title"
                        className={inputCls}
                      />
                      <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        required
                        minLength={1}
                        maxLength={5000}
                        rows={4}
                        placeholder="What's on your mind?"
                        className={`${inputCls} resize-none`}
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={postLoading}
                          className={btnPrimaryCls}
                        >
                          {postLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Publish
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPostForm(false)}
                          className={btnGhostCls}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {posts.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                text="No discussions yet. Be the first!"
              />
            ) : (
              [...posts]
                .sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
                .map((post) => {
                  const name =
                    post.user?.displayName ??
                    post.user?.username ??
                    post.author?.displayName ??
                    post.author?.username ??
                    "?";
                  const authorId = post.userId ?? post.author?.id;
                  const isPostAuthor = session?.user?.id === authorId;
                  const canModPost = isAdmin;
                  const isExpanded = expandedPost === post.id;
                  const isEditing = editingPost === post.id;

                  return (
                    <div
                      key={post.id}
                      className="group/post relative rounded-2xl border transition-all duration-300 hover:border-white/10 overflow-hidden backdrop-blur-md"
                      style={{
                        borderColor: post.isPinned
                          ? "rgba(168,85,247,0.3)"
                          : "rgba(255,255,255,0.05)",
                        background: post.isPinned
                          ? "rgba(168,85,247,0.04)"
                          : "rgba(24,24,27,0.4)",
                        boxShadow: post.isPinned
                          ? "0 4px 24px -4px rgba(168,85,247,0.15)"
                          : "0 4px 24px -4px rgba(0,0,0,0.3)",
                      }}
                    >
                      {/* scanline for posts */}
                      <div
                        className="absolute inset-0 opacity-[0.02] pointer-events-none"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
                        }}
                      />
                      <div className="p-5 relative z-10">
                        {isEditing ? (
                          <div className="space-y-3">
                            <input
                              value={editPostTitle}
                              onChange={(e) => setEditPostTitle(e.target.value)}
                              className={inputCls}
                            />
                            <textarea
                              value={editPostContent}
                              onChange={(e) =>
                                setEditPostContent(e.target.value)
                              }
                              rows={4}
                              className={`${inputCls} resize-none`}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveEditPost(post.id)}
                                className={btnPrimaryCls}
                              >
                                <Check className="h-3.5 w-3.5" /> Save
                              </button>
                              <button
                                onClick={() => setEditingPost(null)}
                                className={btnGhostCls}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <Avatar
                              src={
                                post.user?.avatarUrl ?? post.author?.avatarUrl
                              }
                              name={name}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {post.isPinned && (
                                  <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-purple-400">
                                    <Pin className="h-3 w-3" /> Pinned
                                  </span>
                                )}
                                <span className="font-bold text-sm text-white leading-snug">
                                  {post.title}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                                {post.content}
                              </p>
                              <div className="flex items-center gap-3 mt-2.5 text-[11px] text-zinc-600">
                                <span className="text-zinc-500 font-medium">
                                  {name}
                                </span>
                                <span className="text-zinc-800">·</span>
                                <span>{formatDate(post.createdAt)}</span>
                                <button
                                  onClick={() => togglePost(post.id)}
                                  className="flex items-center gap-1 hover:text-zinc-400 transition-colors ml-1"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{post.commentsCount ?? 0}</span>
                                </button>
                              </div>
                            </div>
                            {(isPostAuthor || canModPost) && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                {isPostAuthor && (
                                  <button
                                    onClick={() => {
                                      setEditingPost(post.id);
                                      setEditPostTitle(post.title);
                                      setEditPostContent(post.content);
                                    }}
                                    className="p-1.5 rounded-lg text-zinc-700 hover:text-zinc-300 hover:bg-white/5 transition-all"
                                    title="Edit"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {canModPost && (
                                  <button
                                    onClick={() =>
                                      handlePinPost(post.id, !post.isPinned)
                                    }
                                    className={`p-1.5 rounded-lg transition-all ${post.isPinned ? "text-purple-400 bg-purple-400/10" : "text-zinc-700 hover:text-purple-400 hover:bg-white/5"}`}
                                    title={post.isPinned ? "Unpin" : "Pin"}
                                  >
                                    {post.isPinned ? (
                                      <PinOff className="h-3.5 w-3.5" />
                                    ) : (
                                      <Pin className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-950/20 transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Comments */}
                      {isExpanded && !isEditing && (
                        <div
                          className="border-t border-white/5"
                          style={{ background: "rgba(0,0,0,0.2)" }}
                        >
                          {!commentsLoaded[post.id] ? (
                            <div className="flex items-center gap-2 p-4 text-zinc-600 text-xs">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                              Loading comments...
                            </div>
                          ) : (
                            <div className="px-4 py-4 space-y-3">
                              {(postComments[post.id] ?? []).length === 0 && (
                                <p className="text-xs text-zinc-700 py-1">
                                  No comments yet.
                                </p>
                              )}
                              {(postComments[post.id] ?? []).map((c: any) => {
                                const cname =
                                  c.author?.displayName ??
                                  c.author?.username ??
                                  "?";
                                const isCommentAuthor =
                                  session?.user?.id === c.userId;
                                return (
                                  <div key={c.id} className="flex gap-3 group">
                                    <Avatar
                                      src={c.author?.avatarUrl}
                                      name={cname}
                                      size="sm"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-baseline gap-2">
                                        <span className="text-xs font-bold text-zinc-300">
                                          {cname}
                                        </span>
                                        <span className="text-[10px] text-zinc-700">
                                          {formatDate(c.createdAt)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                                        {c.content}
                                      </p>
                                    </div>
                                    {(isCommentAuthor || isAdmin) && (
                                      <button
                                        onClick={() =>
                                          handleDeleteComment(post.id, c.id)
                                        }
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-700 hover:text-red-400 transition-all"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                              {isMember && (
                                <div className="flex gap-2 pt-2 border-t border-white/5">
                                  <input
                                    value={commentInput[post.id] ?? ""}
                                    onChange={(e) =>
                                      setCommentInput((prev) => ({
                                        ...prev,
                                        [post.id]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) =>
                                      e.key === "Enter" &&
                                      !e.shiftKey &&
                                      (e.preventDefault(),
                                      handleAddComment(post.id))
                                    }
                                    placeholder="Write a comment..."
                                    className="flex-1 bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 transition-all font-medium"
                                  />
                                  <button
                                    onClick={() => handleAddComment(post.id)}
                                    disabled={
                                      !(commentInput[post.id] ?? "").trim()
                                    }
                                    className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 disabled:opacity-30 transition-all border border-purple-500/20"
                                  >
                                    <Send className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* ── Events ────────────────────────────────────────────────────── */}
        {activeTab === "events" && (
          <div className="max-w-2xl space-y-4">
            {isAdmin && (
              <div className="mb-6">
                {!showEventForm ? (
                  <button
                    onClick={() => setShowEventForm(true)}
                    className="group relative flex items-center gap-4 w-full text-left px-6 py-5 rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all text-sm font-medium overflow-hidden backdrop-blur-md"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 border border-purple-500/20 transition-all">
                      <Plus className="h-5 w-5 text-purple-400" />
                    </div>
                    <span className="relative z-10 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      Schedule a session...
                    </span>
                  </button>
                ) : (
                  <div
                    className="rounded-xl border border-white/8 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        New Session
                      </span>
                      <button
                        onClick={() => setShowEventForm(false)}
                        className="text-zinc-600 hover:text-zinc-400 transition-colors p-0.5 rounded-md hover:bg-white/5"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <form
                      onSubmit={handleCreateEvent}
                      className="p-5 space-y-3"
                    >
                      <input
                        value={newEvent.title}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, title: e.target.value })
                        }
                        required
                        placeholder="Title (e.g., Let's watch Inception!)"
                        className={inputCls}
                      />
                      <div className="flex gap-3 mt-2 mb-2">
                        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                          <input
                            type="radio"
                            checked={newEvent.eventType === "watch"}
                            onChange={() =>
                              setNewEvent({ ...newEvent, eventType: "watch" })
                            }
                            className="accent-purple-500"
                          />
                          Watch Party
                        </label>
                        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                          <input
                            type="radio"
                            checked={newEvent.eventType === "discussion"}
                            onChange={() =>
                              setNewEvent({
                                ...newEvent,
                                eventType: "discussion",
                                media: null,
                              })
                            }
                            className="accent-purple-500"
                          />
                          General Discussion
                        </label>
                      </div>

                      {newEvent.eventType === "watch" && (
                        <div className="mb-2">
                          <MediaSearchInput
                            value={newEvent.media}
                            onChange={(media) =>
                              setNewEvent({ ...newEvent, media })
                            }
                            placeholder="Search for movie or series to watch..."
                          />
                        </div>
                      )}

                      <textarea
                        value={newEvent.description}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            description: e.target.value,
                          })
                        }
                        rows={2}
                        placeholder="Description (optional)"
                        className={`${inputCls} resize-none max-h-[100px]`}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">
                            Date and time
                          </label>
                          <input
                            type="datetime-local"
                            value={newEvent.scheduledAt}
                            onChange={(e) =>
                              setNewEvent({
                                ...newEvent,
                                scheduledAt: e.target.value,
                              })
                            }
                            required
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">
                            Link
                          </label>
                          <input
                            value={newEvent.meetLink}
                            onChange={(e) =>
                              setNewEvent({
                                ...newEvent,
                                meetLink: e.target.value,
                              })
                            }
                            placeholder="https://..."
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={eventLoading}
                          className={btnPrimaryCls}
                        >
                          {eventLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          Create Session
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEventForm(false)}
                          className={btnGhostCls}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {events.length === 0 ? (
              <EmptyState icon={Calendar} text="No sessions scheduled yet." />
            ) : (
              [
                events.filter((e) => new Date(e.scheduledAt) >= new Date()),
                events.filter((e) => new Date(e.scheduledAt) < new Date()),
              ].map((group, idx) =>
                group.length > 0 ? (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                        {idx === 0 ? "Upcoming Sessions" : "Past Sessions"}
                      </span>
                      <div className="flex-1 h-px bg-zinc-800/80" />
                    </div>
                    {[...group]
                      .sort((a, b) =>
                        idx === 0
                          ? new Date(a.scheduledAt).getTime() -
                            new Date(b.scheduledAt).getTime()
                          : new Date(b.scheduledAt).getTime() -
                            new Date(a.scheduledAt).getTime(),
                      )
                      .map((event) => {
                        const isPast = new Date(event.scheduledAt) < new Date();
                        const d = new Date(event.scheduledAt);
                        return (
                          <div
                            key={event.id}
                            className="rounded-xl border overflow-hidden transition-all duration-200"
                            style={{
                              borderColor: isPast
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(255,255,255,0.07)",
                              background: isPast
                                ? "rgba(255,255,255,0.01)"
                                : "rgba(255,255,255,0.02)",
                              opacity: isPast ? 0.55 : 1,
                            }}
                          >
                            <div className="flex items-stretch">
                              {/* Date block */}
                              <div
                                className="shrink-0 flex flex-col items-center justify-center px-5 py-4 min-w-[64px] border-r"
                                style={{
                                  borderColor: isPast
                                    ? "rgba(255,255,255,0.04)"
                                    : "rgba(168,85,247,0.2)",
                                  background: isPast
                                    ? "rgba(255,255,255,0.02)"
                                    : "rgba(168,85,247,0.08)",
                                }}
                              >
                                <div
                                  className="text-3xl font-black leading-none"
                                  style={{ color: isPast ? "#52525b" : "#fff" }}
                                >
                                  {d.getDate()}
                                </div>
                                <div
                                  className="text-[9px] font-black uppercase tracking-widest mt-1"
                                  style={{
                                    color: isPast ? "#3f3f46" : "#a855f7",
                                  }}
                                >
                                  {d.toLocaleDateString("en-US", {
                                    month: "short",
                                  })}
                                </div>
                              </div>
                              {/* Content */}
                              <div className="flex-1 p-4">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-bold text-sm text-white leading-snug">
                                    {event.title}
                                  </h4>
                                  {isAdmin && (
                                    <button
                                      onClick={() =>
                                        handleDeleteEvent(event.id)
                                      }
                                      className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-950/20 transition-all shrink-0"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                                {event.description && (
                                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-600 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDateTime(event.scheduledAt)}
                                  </span>
                                  <span className="flex items-center gap-1 text-indigo-400/80">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {event.goingCount} going
                                  </span>
                                  <span className="flex items-center gap-1 text-purple-400/80">
                                    <Star className="h-3 w-3" />
                                    {event.interestedCount} interested
                                  </span>
                                </div>
                                {event.meetLink && !isPast && (
                                  <a
                                    href={event.meetLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                                  >
                                    <Video className="h-3.5 w-3.5" /> Join
                                    Session <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                                {isMember && !isPast && (
                                  <div className="flex items-center gap-1.5 mt-3">
                                    {(
                                      [
                                        "going",
                                        "interested",
                                        "not_going",
                                      ] as const
                                    ).map((s) => {
                                      const labels = {
                                        going: "Vou",
                                        interested: "Talvez",
                                        not_going: "Não vou",
                                      };
                                      const active = {
                                        going: {
                                          color: "#34d399",
                                          bg: "rgba(52,211,153,0.1)",
                                          border: "rgba(52,211,153,0.3)",
                                        },
                                        interested: {
                                          color: "#fbbf24",
                                          bg: "rgba(251,191,36,0.1)",
                                          border: "rgba(251,191,36,0.3)",
                                        },
                                        not_going: {
                                          color: "#f87171",
                                          bg: "rgba(248,113,113,0.1)",
                                          border: "rgba(248,113,113,0.3)",
                                        },
                                      }[s];
                                      const isActive = event.myRsvp === s;
                                      return (
                                        <button
                                          key={s}
                                          onClick={() =>
                                            handleRsvp(event.id, s)
                                          }
                                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all"
                                          style={
                                            isActive
                                              ? {
                                                  color: active.color,
                                                  background: active.bg,
                                                  borderColor: active.border,
                                                }
                                              : {
                                                  color: "#71717a",
                                                  background: "transparent",
                                                  borderColor:
                                                    "rgba(255,255,255,0.08)",
                                                }
                                          }
                                        >
                                          {labels[s]}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : null,
              )
            )}
          </div>
        )}

        {/* ── Watchlist ──────────────────────────────────────────────────── */}
        {activeTab === "watchlist" && (
          <div className="max-w-2xl">
            {isMember && (
              <div className="mb-6">
                {!showWatchlistForm ? (
                  <button
                    onClick={() => setShowWatchlistForm(true)}
                    className="group relative flex items-center gap-4 w-full text-left px-6 py-5 rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all text-sm font-medium overflow-hidden backdrop-blur-md"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 border border-purple-500/20 transition-all">
                      <Plus className="h-5 w-5 text-purple-400" />
                    </div>
                    <span className="relative z-10 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      Suggest a title for the watchlist...
                    </span>
                  </button>
                ) : (
                  <div
                    className="rounded-xl border border-white/8 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Add to Watchlist
                      </span>
                      <button
                        onClick={() => setShowWatchlistForm(false)}
                        className="text-zinc-600 hover:text-zinc-400 p-0.5 rounded-md hover:bg-white/5 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <form
                      onSubmit={handleAddWatchlistItem}
                      className="p-5 space-y-3"
                    >
                      <div className="flex flex-col gap-2">
                        <MediaSearchInput
                          value={newWatchlist.media}
                          onChange={(media) =>
                            setNewWatchlist({ ...newWatchlist, media })
                          }
                          placeholder="Search for a movie or series..."
                        />
                      </div>
                      <input
                        value={newWatchlist.note}
                        onChange={(e) =>
                          setNewWatchlist({
                            ...newWatchlist,
                            note: e.target.value,
                          })
                        }
                        placeholder="Note (optional)"
                        className={inputCls}
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={watchlistLoading}
                          className={btnPrimaryCls}
                        >
                          {watchlistLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          Add to Watchlist
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowWatchlistForm(false)}
                          className={btnGhostCls}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {watchlist.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                text="No titles in the watchlist yet."
              />
            ) : (
              <div className="space-y-2">
                {[...watchlist]
                  .sort((a, b) => Number(a.isWatched) - Number(b.isWatched))
                  .map((item) => {
                    const canToggleWatched = isAdmin;
                    const canRemove =
                      isAdmin || item.suggestedBy === session?.user?.id;
                    return (
                      <div
                        key={item.id}
                        className="group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 overflow-hidden hover:scale-[1.01]"
                        style={{
                          borderColor: item.isWatched
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(168,85,247,0.15)",
                          background: item.isWatched
                            ? "rgba(255,255,255,0.01)"
                            : "rgba(24,24,27,0.4)",
                          backdropFilter: "blur(20px)",
                          opacity: item.isWatched ? 0.6 : 1,
                          boxShadow: item.isWatched ? "none" : "0 8px 32px -8px rgba(0,0,0,0.5)",
                        }}
                      >
                        {/* Hover glow */}
                        {!item.isWatched && (
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        )}
                        <div
                          className="absolute inset-0 opacity-[0.02] pointer-events-none"
                          style={{
                            backgroundImage:
                              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
                          }}
                        />
                        {/* Poster */}
                        <div
                          className="relative z-10 w-9 h-14 shrink-0 rounded-lg overflow-hidden border border-white/5"
                          style={{ background: "#111" }}
                        >
                          {item.mediaPosterPath ? (
                            <Image
                              fill
                              src={item.mediaPosterPath}
                              alt={item.mediaTitle}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="h-4 w-4 text-zinc-700" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white line-clamp-1">
                              {item.mediaTitle}
                            </span>
                            {item.isWatched && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border border-white/5 bg-zinc-950 text-purple-400">
                              {item.mediaType === "movie" ? "Movie" : "Series"}
                            </span>
                            {item.note && (
                              <span className="text-xs text-zinc-600 line-clamp-1">
                                {item.note}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canToggleWatched && (
                            <button
                              onClick={() =>
                                handleToggleWatched(item.id, !item.isWatched)
                              }
                              className={`p-1.5 rounded-lg transition-all ${item.isWatched ? "text-zinc-500 hover:text-zinc-300 hover:bg-white/5" : "text-emerald-400 hover:bg-emerald-950/30"}`}
                              title={
                                item.isWatched
                                  ? "Unmark as watched"
                                  : "Mark as watched"
                              }
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {canRemove && (
                            <button
                              onClick={() => handleRemoveWatchlistItem(item.id)}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-950/20 transition-all"
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── Polls ─────────────────────────────────────────────────────── */}
        {activeTab === "polls" && (
          <div className="max-w-2xl space-y-4">
            {isMember && (
              <div className="mb-6">
                {!showPollForm ? (
                  <button
                    onClick={() => setShowPollForm(true)}
                    className="group relative flex items-center gap-4 w-full text-left px-6 py-5 rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all text-sm font-medium overflow-hidden backdrop-blur-md"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 border border-purple-500/20 transition-all">
                      <Plus className="h-5 w-5 text-purple-400" />
                    </div>
                    <span className="relative z-10 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      Start a poll...
                    </span>
                  </button>
                ) : (
                  <div
                    className="rounded-xl border border-white/8 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        New Poll
                      </span>
                      <button
                        onClick={() => setShowPollForm(false)}
                        className="text-zinc-600 hover:text-zinc-400 p-0.5 rounded-md hover:bg-white/5 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <form onSubmit={handleCreatePoll} className="p-5 space-y-4">
                      <input
                        value={newPollQuestion}
                        onChange={(e) => setNewPollQuestion(e.target.value)}
                        required
                        minLength={5}
                        maxLength={300}
                        placeholder="What is your question?"
                        className={inputCls}
                      />
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                          Options (min. 2, max. 10)
                        </label>
                        {newPollOptions.map((opt, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              value={opt}
                              onChange={(e) =>
                                setNewPollOptions((prev) =>
                                  prev.map((o, j) =>
                                    j === i ? e.target.value : o,
                                  ),
                                )
                              }
                              placeholder={`Option ${i + 1}`}
                              className={`${inputCls} flex-1`}
                            />
                            {newPollOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setNewPollOptions((prev) =>
                                    prev.filter((_, j) => j !== i),
                                  )
                                }
                                className="p-2 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {newPollOptions.length < 10 && (
                          <button
                            type="button"
                            onClick={() =>
                              setNewPollOptions((prev) => [...prev, ""])
                            }
                            className="text-xs font-medium text-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-1.5 mt-1"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add option
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">
                          Expiry (optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={newPollExpiry}
                          onChange={(e) => setNewPollExpiry(e.target.value)}
                          className="bg-zinc-900 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500/50 transition-all"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={pollCreateLoading}
                          className={btnPrimaryCls}
                        >
                          {pollCreateLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <BarChart2 className="h-3.5 w-3.5" />
                          )}
                          Create Poll
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPollForm(false)}
                          className={btnGhostCls}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {polls.length === 0 ? (
              <EmptyState icon={BarChart2} text="No polls yet." />
            ) : (
              polls.map((poll) => {
                const isExpired = poll.expiresAt
                  ? new Date(poll.expiresAt) < new Date()
                  : false;
                const hasVoted = !!poll.myVote;
                return (
                  <div
                    key={poll.id}
                    className="relative rounded-2xl border border-white/10 p-6 overflow-hidden transition-all duration-300 hover:border-purple-500/30"
                    style={{
                      background: "rgba(24,24,27,0.4)",
                      backdropFilter: "blur(20px)",
                      boxShadow: "0 12px 40px -12px rgba(0,0,0,0.7)",
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-[0.03] pointer-events-none"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
                      }}
                    />
                    <h4 className="relative z-10 font-black text-xl text-white mb-6 leading-snug tracking-tight">
                      {poll.question}
                    </h4>
                    <div className="space-y-2.5">
                      {poll.options.map((opt) => {
                        const pct =
                          poll.totalVotes > 0
                            ? Math.round(
                                (opt.votesCount / poll.totalVotes) * 100,
                              )
                            : 0;
                        const isMyVote = poll.myVote === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={hasVoted || isExpired || !isMember}
                            onClick={() => handleVote(poll.id, opt.id)}
                            className="relative w-full text-left overflow-hidden rounded-xl border transition-all duration-300"
                            style={{
                              borderColor: isMyVote
                                ? "rgba(168,85,247,0.5)"
                                : "rgba(255,255,255,0.08)",
                              background: isMyVote
                                ? "rgba(168,85,247,0.08)"
                                : "rgba(255,255,255,0.04)",
                            }}
                          >
                            {/* Progress fill */}
                            {(hasVoted || isExpired) && (
                              <div
                                className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out"
                                style={{
                                  width: `${pct}%`,
                                  background: isMyVote
                                    ? "linear-gradient(90deg, rgba(168,85,247,0.2), rgba(168,85,247,0.1))"
                                    : "rgba(255,255,255,0.05)",
                                }}
                              />
                            )}
                            <div className="relative flex items-center gap-3 px-3.5 py-2.5">
                              {opt.mediaPosterPath && (
                                <div className="relative w-5 h-8 shrink-0 rounded overflow-hidden">
                                  <Image
                                    fill
                                    src={opt.mediaPosterPath}
                                    alt=""
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <span className="text-sm text-zinc-200 flex-1">
                                {opt.text}
                              </span>
                              {(hasVoted || isExpired) && (
                                <span
                                  className="text-xs font-bold tabular-nums"
                                  style={{
                                    color: isMyVote ? "#a855f7" : "#52525b",
                                  }}
                                >
                                  {pct}%
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-700">
                      <span>{poll.totalVotes} votes</span>
                      {poll.expiresAt && (
                        <>
                          <span className="text-zinc-800">·</span>
                          <span
                            style={{ color: isExpired ? "#f87171" : undefined }}
                          >
                            {isExpired
                              ? "Closed"
                              : `Until ${formatDate(poll.expiresAt)}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Members ───────────────────────────────────────────────────── */}
        {activeTab === "members" && (
          <div className="max-w-lg">
            {members.length === 0 ? (
              <EmptyState icon={Users} text="No members yet." />
            ) : (
              <div
                className="relative rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5 shadow-2xl transition-all duration-300 hover:border-purple-500/20"
                style={{
                  background: "rgba(24,24,27,0.4)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-[0.02] pointer-events-none"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
                  }}
                />
                {members.map((m) => {
                  const badge =
                    ROLE_BADGE[m.role as keyof typeof ROLE_BADGE] ??
                    ROLE_BADGE.member;
                  const BadgeIcon = badge.icon;
                  const name = m.user.displayName ?? m.user.username ?? "?";
                  return (
                    <div
                      key={m.id}
                      className="relative z-10 flex items-center gap-4 px-4 py-3.5 hover:bg-purple-500/[0.03] transition-colors group/member"
                    >
                      <Avatar src={m.user.avatarUrl} name={name} size="md" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-zinc-100 block line-clamp-1 group-hover/member:text-purple-300 transition-colors">
                          {name}
                        </span>
                        {m.user.username && (
                          <span className="text-xs text-zinc-600">
                            @{m.user.username}
                          </span>
                        )}
                      </div>
                      <span
                        className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all duration-300 group-hover/member:scale-105 shadow-sm ${badge.color}`}
                      >
                        <BadgeIcon className="h-3 w-3" />
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Manage ────────────────────────────────────────────────────── */}
        {activeTab === "manage" && isAdmin && (
          <div className="max-w-2xl space-y-4">
            {/* Invite */}
            <div
              className="rounded-2xl border border-white/10 p-6 shadow-xl relative overflow-hidden"
              style={{ background: "rgba(24,24,27,0.4)", backdropFilter: "blur(20px)" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.02] to-transparent opacity-50 pointer-events-none" />
              <h3 className="relative z-10 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-5 flex items-center gap-2.5">
                <UserPlus className="h-4 w-4 text-purple-400" /> Invite
                Member
              </h3>
              <div className="flex gap-2">
                <input
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  placeholder="@username"
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={handleInvite}
                  disabled={inviteLoading || !inviteInput.trim()}
                  className={btnPrimaryCls}
                >
                  {inviteLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  Invite
                </button>
              </div>
            </div>

            {/* Join Requests */}
            {!club.isPublic && club.allowJoinRequests && (
              <div
                className="rounded-xl border border-white/7 p-5"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
                  Join Requests
                  {joinRequests.length > 0 && (
                    <span className="text-[10px] font-black bg-purple-500/15 text-purple-300 border border-purple-500/25 px-2 py-0.5 rounded-md">
                      {joinRequests.length}
                    </span>
                  )}
                </h3>
                {!joinReqLoaded ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-600 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                  </div>
                ) : joinRequests.length === 0 ? (
                  <p className="text-sm text-zinc-700 py-2">
                    No pending requests.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {joinRequests.map((req: any) => {
                      const name =
                        req.requester?.displayName ??
                        req.requester?.username ??
                        "?";
                      return (
                        <div
                          key={req.request.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]"
                        >
                          <Avatar
                            src={req.requester?.avatarUrl}
                            name={name}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-zinc-200 block">
                              {name}
                            </span>
                            {req.requester?.username && (
                              <span className="text-xs text-zinc-600">
                                @{req.requester.username}
                              </span>
                            )}
                            {req.request.message && (
                              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                                {req.request.message}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() =>
                                handleAcceptRequest(req.request.id)
                              }
                              className="flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 border border-purple-500/25 hover:border-purple-400/40 bg-purple-500/8 hover:bg-purple-500/15 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <UserCheck className="h-3.5 w-3.5" /> Accept
                            </button>
                            <button
                              onClick={() =>
                                handleRejectRequest(req.request.id)
                              }
                              className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-red-400 border border-white/10 hover:border-red-500/30 bg-white/5 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <UserX className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Member Management */}
            <div
              className="relative rounded-2xl border border-white/10 p-6 overflow-hidden shadow-2xl"
              style={{
                background: "rgba(24,24,27,0.4)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
                }}
              />
              <h3 className="relative z-10 text-xs font-black uppercase tracking-[0.15em] text-zinc-500 mb-5 flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-500" /> Manage Members
              </h3>
              {members.length === 0 ? (
                <p className="text-sm text-zinc-700 py-2">No members.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {members.map((m) => {
                    const name = m.user.displayName ?? m.user.username ?? "?";
                    const isMyself = m.userId === session?.user?.id;
                    const canKick =
                      !isMyself &&
                      m.role !== "owner" &&
                      (myRole === "owner" ||
                        (myRole === "moderator" && m.role === "member"));
                    const canPromote =
                      myRole === "owner" && !isMyself && m.role !== "owner";
                    const badge =
                      ROLE_BADGE[m.role as keyof typeof ROLE_BADGE] ??
                      ROLE_BADGE.member;
                    const BadgeIcon = badge.icon;
                    return (
                      <div key={m.id} className="flex items-center gap-3 py-3">
                        <Avatar src={m.user.avatarUrl} name={name} size="md" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-zinc-200 block line-clamp-1">
                            {name}
                          </span>
                          {m.user.username && (
                            <span className="text-xs text-zinc-600">
                              @{m.user.username}
                            </span>
                          )}
                        </div>
                        <span
                          className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${badge.color}`}
                        >
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {canPromote && m.role === "member" && (
                            <button
                              onClick={() =>
                                handleSetRole(m.userId, "moderator")
                              }
                              title="Promote to Moderator"
                              className="p-1.5 rounded-lg text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 transition-all"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                          )}
                          {canPromote && m.role === "moderator" && (
                            <button
                              onClick={() => handleSetRole(m.userId, "member")}
                              title="Demote to Member"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-300 hover:bg-white/5 transition-all"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          )}
                          {canKick && (
                            <button
                              onClick={() => handleKick(m.userId)}
                              title="Remove from club"
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {/* Sidebar Widgets */}
          <aside className="lg:col-span-4 sticky top-10 space-y-8 flex flex-col pb-10">
            <ClubInfoWidget club={club} />
            <NextSessionWidget event={events[0]} />
            <TopPollWidget poll={polls[0]} />
            <WatchlistSpotlightWidget item={watchlist[watchlist.length - 1]} />
          </aside>
        </div>
      </div>
    </div>
  );
}
