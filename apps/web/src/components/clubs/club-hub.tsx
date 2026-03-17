"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import type {
  Club,
  ClubPost,
  ClubEvent,
  ClubWatchlistItem,
  ClubPoll,
  ClubMember,
} from "@/lib/queries/clubs";

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
    throw new Error(err.error || "Erro na requisição");
  }
  return res.json();
}

const ROLE_BADGE = {
  owner: {
    label: "Dono",
    icon: Crown,
    color: "text-amber-300 bg-amber-400/10 border-amber-400/25",
  },
  moderator: {
    label: "Mod",
    icon: Shield,
    color: "text-sky-300 bg-sky-400/10 border-sky-400/25",
  },
  member: {
    label: "Membro",
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
  "by-director": "Por Diretor",
  "by-actor": "Por Ator",
  "by-decade": "Por Década",
  "by-country": "Por País",
  general: "Geral",
};

const BASE_TABS = [
  { value: "posts", label: "Discussões", icon: MessageSquare },
  { value: "events", label: "Sessões", icon: Calendar },
  { value: "watchlist", label: "Watchlist", icon: Bookmark },
  { value: "polls", label: "Votações", icon: BarChart2 },
  { value: "members", label: "Membros", icon: Users },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
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
      className={`${dim} rounded-full shrink-0 overflow-hidden ring-1 ring-white/8`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" />
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
    <div className="py-20 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-white/5 mb-4">
        <Icon className="h-6 w-6 text-zinc-600" />
      </div>
      <p className="text-zinc-600 text-sm">{text}</p>
    </div>
  );
}

// ─── Input / Textarea shared styles ────────────────────────────────────────────
const inputCls =
  "w-full bg-zinc-900 border border-white/8 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all rounded-lg";
const btnPrimaryCls =
  "flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 transition-all rounded-lg shadow-lg shadow-amber-900/20";
const btnGhostCls =
  "px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:text-zinc-300 border border-white/8 hover:border-white/15 transition-all rounded-lg";

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
    scheduledAt: "",
    meetLink: "",
  });
  const [eventLoading, setEventLoading] = useState(false);

  // Watchlist state
  const [showWatchlistForm, setShowWatchlistForm] = useState(false);
  const [newWatchlist, setNewWatchlist] = useState({
    mediaTitle: "",
    mediaType: "movie" as "movie" | "series",
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
    ...(isAdmin
      ? [{ value: "manage", label: "Gerenciar", icon: Settings }]
      : []),
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
        toast.success("Solicitação enviada! Aguarde aprovação.");
      } else {
        await apiFetch(`/clubs/${club.id}/join`, { method: "POST" });
        toast.success("Você entrou no club!");
        setMyRole("member");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleLeave() {
    if (!confirm("Tem certeza que quer sair do club?")) return;
    try {
      await apiFetch(`/clubs/${club.id}/leave`, { method: "DELETE" });
      toast.success("Você saiu do club.");
      setMyRole(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
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
      toast.success("Post criado!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setPostLoading(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Excluir este post?")) return;
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post excluído.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
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
      toast.success(pinned ? "Post fixado!" : "Post desfixado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
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
      toast.success("Post atualizado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
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
      toast.error(err instanceof Error ? err.message : "Erro");
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
      toast.error(err instanceof Error ? err.message : "Erro");
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
          scheduledAt: newEvent.scheduledAt,
          meetLink: newEvent.meetLink || undefined,
        }),
      });
      setEvents((prev) => [
        ...prev,
        { ...data.data, goingCount: 0, interestedCount: 0, myRsvp: null },
      ]);
      setNewEvent({
        title: "",
        description: "",
        scheduledAt: "",
        meetLink: "",
      });
      setShowEventForm(false);
      toast.success("Sessão criada!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
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
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Excluir esta sessão?")) return;
    try {
      await apiFetch(`/clubs/${club.id}/events/${eventId}`, {
        method: "DELETE",
      });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success("Sessão excluída.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  // ── Watchlist ───────────────────────────────────────────────────────────────

  async function handleAddWatchlistItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newWatchlist.mediaTitle.trim()) return;
    setWatchlistLoading(true);
    try {
      const data = await apiFetch(`/clubs/${club.id}/watchlist`, {
        method: "POST",
        body: JSON.stringify({
          mediaTitle: newWatchlist.mediaTitle,
          mediaType: newWatchlist.mediaType,
          note: newWatchlist.note || undefined,
        }),
      });
      setWatchlist((prev) => [...prev, data.data]);
      setNewWatchlist({ mediaTitle: "", mediaType: "movie", note: "" });
      setShowWatchlistForm(false);
      toast.success("Adicionado à watchlist!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
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
    <div
      className="min-h-screen"
      style={{ background: "#080810", color: "#e4e4f0" }}
    >
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Banner */}
        <div className="relative h-72 lg:h-96 w-full overflow-hidden">
          {club.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.coverUrl}
              alt={club.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 0%, #1e0a3c 0%, #0d0a1a 60%, #080810 100%)",
              }}
            >
              {/* Subtle grid texture */}
              <div
                className="absolute inset-0 opacity-[0.035]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
                  backgroundSize: "48px 48px",
                }}
              />
              {/* Glow orbs */}
              <div
                className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20"
                style={{
                  background:
                    "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
                  filter: "blur(60px)",
                }}
              />
              <div
                className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full opacity-10"
                style={{
                  background:
                    "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
                  filter: "blur(80px)",
                }}
              />
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, #080810 0%, #080810aa 40%, transparent 100%)",
            }}
          />
        </div>

        {/* Profile Content */}
        <div className="container mx-auto px-6 relative z-10 -mt-28 lg:-mt-36">
          <Link
            href="/clubs"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors mb-6 group"
          >
            <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Todos os clubs
          </Link>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            {/* Avatar */}
            <div className="shrink-0">
              <div
                className="w-32 h-32 lg:w-36 lg:h-36 rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.08), 0 24px 48px rgba(0,0,0,0.6)",
                }}
              >
                <div
                  className="w-full h-full flex items-center justify-center text-5xl font-black text-white"
                  style={{
                    background: "linear-gradient(145deg, #4c1d95, #1e1b4b)",
                  }}
                >
                  {club.name[0]?.toUpperCase() ?? "?"}
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  {/* Visibility badge */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {club.isPublic ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-2 py-0.5 rounded-md border border-zinc-700/50 bg-zinc-800/50">
                        <Globe className="h-2.5 w-2.5" /> Público
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-violet-400 px-2 py-0.5 rounded-md border border-violet-600/30 bg-violet-900/20">
                        <Lock className="h-2.5 w-2.5" /> Privado
                      </span>
                    )}
                    {club.categories.slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] font-bold uppercase tracking-widest text-zinc-600"
                      >
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                    ))}
                  </div>

                  <h1 className="text-3xl lg:text-5xl font-black text-white leading-none tracking-tight mb-2">
                    {club.name}
                  </h1>

                  {club.description && (
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-xl line-clamp-2 mt-2">
                      {club.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3 text-xs text-zinc-600">
                    <Avatar
                      src={club.owner.avatarUrl}
                      name={
                        club.owner.displayName ?? club.owner.username ?? "?"
                      }
                      size="sm"
                    />
                    <span>por</span>
                    <Link
                      href={`/profile/${club.owner.username}`}
                      className="text-zinc-300 hover:text-white transition-colors font-semibold"
                    >
                      {club.owner.displayName ?? club.owner.username}
                    </Link>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {isMember ? (
                    <>
                      {myRole &&
                        (() => {
                          const badge =
                            ROLE_BADGE[myRole as keyof typeof ROLE_BADGE] ??
                            ROLE_BADGE.member;
                          const BadgeIcon = badge.icon;
                          return (
                            <span
                              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border ${badge.color}`}
                            >
                              <BadgeIcon className="h-3.5 w-3.5" />
                              {badge.label}
                            </span>
                          );
                        })()}
                      {isAdmin && (
                        <Link
                          href={`/clubs/${club.slug}/settings`}
                          className="h-9 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
                        >
                          <Settings className="h-4 w-4" /> Configurações
                        </Link>
                      )}
                      {myRole !== "owner" && (
                        <button
                          onClick={handleLeave}
                          className="h-9 px-4 rounded-xl text-sm font-semibold border border-white/8 text-zinc-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-950/20 transition-all"
                        >
                          Sair
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
                      className="h-9 px-6 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                      style={{
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        color: "#1a1000",
                        boxShadow: "0 4px 24px rgba(245,158,11,0.25)",
                      }}
                    >
                      {joinLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : club.isPublic ? (
                        "Entrar no Club"
                      ) : club.allowJoinRequests ? (
                        "Solicitar Entrada"
                      ) : (
                        "Clube Fechado"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-6 mt-6 pt-5 border-t border-white/5">
            {[
              { value: club.memberCount, label: "membros" },
              { value: posts.length, label: "discussões" },
              { value: events.length, label: "sessões" },
            ].map(({ value, label }) => (
              <div key={label} className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-white tabular-nums">
                  {value}
                </span>
                <span className="text-xs text-zinc-600 font-medium">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ────────────────────────────────────────────────── */}
      <div
        className="sticky top-14 z-20 border-b"
        style={{
          background: "rgba(8,8,16,0.92)",
          borderColor: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="container mx-auto px-6">
          <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1">
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
                  className="relative flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 rounded-t-lg"
                  style={{
                    color: isActive ? "#ffffff" : "#52525b",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {cnt > 0 && (
                    <span
                      className="text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded"
                      style={{
                        color: isActive ? "#fbbf24" : "#52525b",
                        background: isActive
                          ? "rgba(251,191,36,0.12)"
                          : "rgba(255,255,255,0.04)",
                      }}
                    >
                      {cnt}
                    </span>
                  )}
                  {/* Active indicator */}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t-full"
                      style={{
                        background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 py-8">
        {/* ── Posts ─────────────────────────────────────────────────────── */}
        {activeTab === "posts" && (
          <div className="max-w-2xl space-y-3">
            {isMember && (
              <div className="mb-6">
                {!showPostForm ? (
                  <button
                    onClick={() => setShowPostForm(true)}
                    className="group flex items-center gap-2.5 w-full text-left px-4 py-3.5 rounded-xl border border-dashed border-white/10 text-zinc-600 hover:text-zinc-300 hover:border-amber-500/30 hover:bg-amber-950/10 transition-all text-sm font-medium"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <Plus className="h-4 w-4 text-amber-400" />
                    </div>
                    Iniciar uma discussão...
                  </button>
                ) : (
                  <div
                    className="rounded-xl border border-white/8 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Nova Discussão
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
                        placeholder="Título da discussão"
                        className={inputCls}
                      />
                      <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        required
                        minLength={1}
                        maxLength={5000}
                        rows={4}
                        placeholder="O que você quer discutir?"
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
                          Publicar
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPostForm(false)}
                          className={btnGhostCls}
                        >
                          Cancelar
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
                text="Nenhuma discussão ainda. Seja o primeiro!"
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
                      className="rounded-xl border transition-all duration-200"
                      style={{
                        borderColor: post.isPinned
                          ? "rgba(245,158,11,0.2)"
                          : "rgba(255,255,255,0.06)",
                        background: post.isPinned
                          ? "rgba(120,60,0,0.08)"
                          : "rgba(255,255,255,0.015)",
                      }}
                    >
                      <div className="p-4">
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
                                <Check className="h-3.5 w-3.5" /> Salvar
                              </button>
                              <button
                                onClick={() => setEditingPost(null)}
                                className={btnGhostCls}
                              >
                                Cancelar
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
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                                    <Pin className="h-2.5 w-2.5" /> Fixado
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
                                    title="Editar"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {canModPost && (
                                  <button
                                    onClick={() =>
                                      handlePinPost(post.id, !post.isPinned)
                                    }
                                    className={`p-1.5 rounded-lg transition-all ${post.isPinned ? "text-amber-400 hover:bg-amber-400/10" : "text-zinc-700 hover:text-amber-400 hover:bg-white/5"}`}
                                    title={post.isPinned ? "Desfixar" : "Fixar"}
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
                                  title="Excluir"
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
                              Carregando comentários...
                            </div>
                          ) : (
                            <div className="px-4 py-4 space-y-3">
                              {(postComments[post.id] ?? []).length === 0 && (
                                <p className="text-xs text-zinc-700 py-1">
                                  Nenhum comentário ainda.
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
                                    placeholder="Escreva um comentário..."
                                    className="flex-1 bg-zinc-900 border border-white/8 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/40 transition-colors"
                                  />
                                  <button
                                    onClick={() => handleAddComment(post.id)}
                                    disabled={
                                      !(commentInput[post.id] ?? "").trim()
                                    }
                                    className="p-2 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 disabled:opacity-30 transition-all"
                                  >
                                    <Send className="h-3.5 w-3.5" />
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
                    className="group flex items-center gap-2.5 w-full text-left px-4 py-3.5 rounded-xl border border-dashed border-white/10 text-zinc-600 hover:text-zinc-300 hover:border-amber-500/30 hover:bg-amber-950/10 transition-all text-sm font-medium"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <Plus className="h-4 w-4 text-amber-400" />
                    </div>
                    Agendar uma sessão...
                  </button>
                ) : (
                  <div
                    className="rounded-xl border border-white/8 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Nova Sessão
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
                        placeholder="Título (ex: Vamos assistir Inception!)"
                        className={inputCls}
                      />
                      <textarea
                        value={newEvent.description}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            description: e.target.value,
                          })
                        }
                        rows={2}
                        placeholder="Descrição (opcional)"
                        className={`${inputCls} resize-none`}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">
                            Data e hora
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
                            Link de reunião
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
                          Criar Sessão
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEventForm(false)}
                          className={btnGhostCls}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {events.length === 0 ? (
              <EmptyState icon={Calendar} text="Nenhuma sessão agendada." />
            ) : (
              [
                events.filter((e) => new Date(e.scheduledAt) >= new Date()),
                events.filter((e) => new Date(e.scheduledAt) < new Date()),
              ].map((group, idx) =>
                group.length > 0 ? (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                        {idx === 0 ? "Próximas Sessões" : "Sessões Passadas"}
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
                                    : "rgba(245,158,11,0.12)",
                                  background: isPast
                                    ? "rgba(255,255,255,0.02)"
                                    : "rgba(120,60,0,0.12)",
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
                                    color: isPast ? "#3f3f46" : "#f59e0b",
                                  }}
                                >
                                  {d.toLocaleDateString("pt-BR", {
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
                                  <span className="flex items-center gap-1 text-emerald-400/80">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {event.goingCount} vão
                                  </span>
                                  <span className="flex items-center gap-1 text-amber-400/80">
                                    <Star className="h-3 w-3" />
                                    {event.interestedCount} interessados
                                  </span>
                                </div>
                                {event.meetLink && !isPast && (
                                  <a
                                    href={event.meetLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                                  >
                                    <Video className="h-3.5 w-3.5" /> Entrar na
                                    Sessão <ExternalLink className="h-3 w-3" />
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
                    className="group flex items-center gap-2.5 w-full text-left px-4 py-3.5 rounded-xl border border-dashed border-white/10 text-zinc-600 hover:text-zinc-300 hover:border-amber-500/30 hover:bg-amber-950/10 transition-all text-sm font-medium"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <Plus className="h-4 w-4 text-amber-400" />
                    </div>
                    Adicionar um título à lista...
                  </button>
                ) : (
                  <div
                    className="rounded-xl border border-white/8 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Adicionar à Watchlist
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
                      <div className="flex gap-2">
                        <input
                          value={newWatchlist.mediaTitle}
                          onChange={(e) =>
                            setNewWatchlist({
                              ...newWatchlist,
                              mediaTitle: e.target.value,
                            })
                          }
                          required
                          placeholder="Nome do filme ou série"
                          className={`${inputCls} flex-1`}
                        />
                        <select
                          value={newWatchlist.mediaType}
                          onChange={(e) =>
                            setNewWatchlist({
                              ...newWatchlist,
                              mediaType: e.target.value as "movie" | "series",
                            })
                          }
                          className="bg-zinc-900 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-all"
                        >
                          <option value="movie">Filme</option>
                          <option value="series">Série</option>
                        </select>
                      </div>
                      <input
                        value={newWatchlist.note}
                        onChange={(e) =>
                          setNewWatchlist({
                            ...newWatchlist,
                            note: e.target.value,
                          })
                        }
                        placeholder="Nota (opcional)"
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
                          Adicionar
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowWatchlistForm(false)}
                          className={btnGhostCls}
                        >
                          Cancelar
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
                text="Nenhum título na watchlist ainda."
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
                        className="group flex items-center gap-3.5 p-3.5 rounded-xl border transition-all"
                        style={{
                          borderColor: item.isWatched
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(255,255,255,0.06)",
                          background: item.isWatched
                            ? "rgba(255,255,255,0.01)"
                            : "rgba(255,255,255,0.02)",
                          opacity: item.isWatched ? 0.5 : 1,
                        }}
                      >
                        {/* Poster */}
                        <div
                          className="w-9 h-14 shrink-0 rounded-lg overflow-hidden border border-white/5"
                          style={{ background: "#111" }}
                        >
                          {item.mediaPosterPath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.mediaPosterPath}
                              alt={item.mediaTitle}
                              className="w-full h-full object-cover"
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
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border"
                              style={
                                item.mediaType === "movie"
                                  ? {
                                      color: "#fbbf24",
                                      borderColor: "rgba(251,191,36,0.2)",
                                      background: "rgba(251,191,36,0.06)",
                                    }
                                  : {
                                      color: "#f472b6",
                                      borderColor: "rgba(244,114,182,0.2)",
                                      background: "rgba(244,114,182,0.06)",
                                    }
                              }
                            >
                              {item.mediaType === "movie" ? "Filme" : "Série"}
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
                                  ? "Desmarcar"
                                  : "Marcar como assistido"
                              }
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {canRemove && (
                            <button
                              onClick={() => handleRemoveWatchlistItem(item.id)}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-950/20 transition-all"
                              title="Remover"
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
                    className="group flex items-center gap-2.5 w-full text-left px-4 py-3.5 rounded-xl border border-dashed border-white/10 text-zinc-600 hover:text-zinc-300 hover:border-amber-500/30 hover:bg-amber-950/10 transition-all text-sm font-medium"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <Plus className="h-4 w-4 text-amber-400" />
                    </div>
                    Criar uma votação...
                  </button>
                ) : (
                  <div
                    className="rounded-xl border border-white/8 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Nova Votação
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
                        placeholder="Qual é a sua pergunta?"
                        className={inputCls}
                      />
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                          Opções (mín. 2, máx. 10)
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
                              placeholder={`Opção ${i + 1}`}
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
                            <Plus className="h-3.5 w-3.5" /> Adicionar opção
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">
                          Encerramento (opcional)
                        </label>
                        <input
                          type="datetime-local"
                          value={newPollExpiry}
                          onChange={(e) => setNewPollExpiry(e.target.value)}
                          className="bg-zinc-900 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-all"
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
                          Criar Votação
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPollForm(false)}
                          className={btnGhostCls}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {polls.length === 0 ? (
              <EmptyState icon={BarChart2} text="Nenhuma votação ainda." />
            ) : (
              polls.map((poll) => {
                const isExpired = poll.expiresAt
                  ? new Date(poll.expiresAt) < new Date()
                  : false;
                const hasVoted = !!poll.myVote;
                return (
                  <div
                    key={poll.id}
                    className="rounded-xl border border-white/7 p-5"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <h4 className="font-bold text-sm text-white mb-4 leading-snug">
                      {poll.question}
                    </h4>
                    <div className="space-y-2">
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
                            className="relative w-full text-left overflow-hidden rounded-lg border transition-all duration-200"
                            style={{
                              borderColor: isMyVote
                                ? "rgba(245,158,11,0.4)"
                                : "rgba(255,255,255,0.06)",
                              background: isMyVote
                                ? "rgba(120,60,0,0.15)"
                                : "rgba(255,255,255,0.03)",
                            }}
                          >
                            {/* Progress fill */}
                            {(hasVoted || isExpired) && (
                              <div
                                className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
                                style={{
                                  width: `${pct}%`,
                                  background: isMyVote
                                    ? "rgba(245,158,11,0.12)"
                                    : "rgba(255,255,255,0.03)",
                                }}
                              />
                            )}
                            <div className="relative flex items-center gap-3 px-3.5 py-2.5">
                              {opt.mediaPosterPath && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={opt.mediaPosterPath}
                                  alt=""
                                  className="w-5 h-8 object-cover rounded shrink-0"
                                />
                              )}
                              <span className="text-sm text-zinc-200 flex-1">
                                {opt.text}
                              </span>
                              {(hasVoted || isExpired) && (
                                <span
                                  className="text-xs font-bold tabular-nums"
                                  style={{
                                    color: isMyVote ? "#fbbf24" : "#52525b",
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
                      <span>{poll.totalVotes} votos</span>
                      {poll.expiresAt && (
                        <>
                          <span className="text-zinc-800">·</span>
                          <span
                            style={{ color: isExpired ? "#f87171" : undefined }}
                          >
                            {isExpired
                              ? "Encerrada"
                              : `Até ${formatDate(poll.expiresAt)}`}
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
              <EmptyState icon={Users} text="Nenhum membro." />
            ) : (
              <div className="rounded-xl border border-white/6 overflow-hidden divide-y divide-white/5">
                {members.map((m) => {
                  const badge =
                    ROLE_BADGE[m.role as keyof typeof ROLE_BADGE] ??
                    ROLE_BADGE.member;
                  const BadgeIcon = badge.icon;
                  const name = m.user.displayName ?? m.user.username ?? "?";
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
                    >
                      <Avatar src={m.user.avatarUrl} name={name} size="md" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-zinc-100 block line-clamp-1">
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
              className="rounded-xl border border-white/7 p-5"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <UserPlus className="h-3.5 w-3.5 text-amber-400" /> Convidar
                Membro
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
                  Convidar
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
                  <UserCheck className="h-3.5 w-3.5 text-sky-400" />
                  Solicitações de Entrada
                  {joinRequests.length > 0 && (
                    <span className="text-[10px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/25 px-2 py-0.5 rounded-md">
                      {joinRequests.length}
                    </span>
                  )}
                </h3>
                {!joinReqLoaded ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-600 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : joinRequests.length === 0 ? (
                  <p className="text-sm text-zinc-700 py-2">
                    Nenhuma solicitação pendente.
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
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-white/5 bg-white/[0.02]"
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
                              className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-500/25 hover:border-emerald-400/40 bg-emerald-500/8 hover:bg-emerald-500/15 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <UserCheck className="h-3.5 w-3.5" /> Aceitar
                            </button>
                            <button
                              onClick={() =>
                                handleRejectRequest(req.request.id)
                              }
                              className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/25 hover:border-red-400/40 bg-red-500/8 hover:bg-red-500/15 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <UserX className="h-3.5 w-3.5" /> Rejeitar
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
              className="rounded-xl border border-white/7 p-5"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-zinc-500" /> Gerenciar
                Membros
              </h3>
              {members.length === 0 ? (
                <p className="text-sm text-zinc-700 py-2">Nenhum membro.</p>
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
                              title="Promover a Moderador"
                              className="p-1.5 rounded-lg text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 transition-all"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                          )}
                          {canPromote && m.role === "moderator" && (
                            <button
                              onClick={() => handleSetRole(m.userId, "member")}
                              title="Rebaixar a Membro"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-300 hover:bg-white/5 transition-all"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          )}
                          {canKick && (
                            <button
                              onClick={() => handleKick(m.userId)}
                              title="Remover do club"
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
    </div>
  );
}
