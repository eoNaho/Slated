"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  MessageSquare, Plus, X, Send, Loader2, Pin, PinOff, Pencil, Trash2, Check,
  ArrowUp, ArrowDown, ChevronDown, ChevronUp, CornerDownRight,
} from "lucide-react";
import type { Club, ClubPost, ClubComment, ClubFlair } from "@/lib/queries/clubs";
import {
  apiFetch, inputCls, btnPrimaryCls, btnGhostCls,
  Avatar, EmptyState, formatDate,
} from "../shared/club-ui";

// ─── Tree builder ─────────────────────────────────────────────────────────────

interface CommentNode extends ClubComment {
  children: CommentNode[];
}

function buildCommentTree(comments: ClubComment[]): CommentNode[] {
  const map: Record<string, CommentNode> = {};
  const roots: CommentNode[] = [];

  for (const c of comments) {
    map[c.id] = { ...c, children: [] };
  }
  for (const c of comments) {
    if (c.parentId && map[c.parentId]) {
      map[c.parentId].children.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  }
  return roots;
}

// ─── Vote button ──────────────────────────────────────────────────────────────

function VoteButtons({
  score,
  myVote,
  onVote,
  size = "md",
}: {
  score: number;
  myVote: 1 | -1 | null | undefined;
  onVote: (v: 1 | -1) => void;
  size?: "md" | "sm";
}) {
  const iconCls = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const btnCls = `p-1 rounded transition-colors focus:outline-none`;

  return (
    <div className={`flex flex-col items-center gap-0.5 ${size === "sm" ? "text-xs" : "text-xs"}`}>
      <button
        onClick={() => onVote(1)}
        className={`${btnCls} ${myVote === 1 ? "text-orange-400" : "text-zinc-600 hover:text-zinc-300"}`}
      >
        <ArrowUp className={iconCls} />
      </button>
      <span className={`font-bold tabular-nums leading-none ${myVote === 1 ? "text-orange-400" : myVote === -1 ? "text-indigo-400" : "text-zinc-500"}`}>
        {score}
      </span>
      <button
        onClick={() => onVote(-1)}
        className={`${btnCls} ${myVote === -1 ? "text-indigo-400" : "text-zinc-600 hover:text-zinc-300"}`}
      >
        <ArrowDown className={iconCls} />
      </button>
    </div>
  );
}

// ─── Flair badge ──────────────────────────────────────────────────────────────

function FlairBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundColor: color + "33", color, border: `1px solid ${color}55` }}
    >
      {name}
    </span>
  );
}

// ─── Comment node (recursive) ─────────────────────────────────────────────────

const INDENT_COLORS = [
  "border-purple-500/40",
  "border-indigo-500/40",
  "border-pink-500/40",
  "border-teal-500/40",
  "border-amber-500/40",
];

function CommentNode({
  node,
  clubId,
  postId,
  session,
  isAdmin,
  isMember,
  onDelete,
  onReplyAdded,
  onVote,
}: {
  node: CommentNode;
  clubId: string;
  postId: string;
  session: any;
  isAdmin: boolean;
  isMember: boolean;
  onDelete: (id: string) => void;
  onReplyAdded: (comment: ClubComment) => void;
  onVote: (commentId: string, value: 1 | -1, current: 1 | -1 | null | undefined) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [localScore, setLocalScore] = useState(node.score);
  const [localMyVote, setLocalMyVote] = useState<1 | -1 | null | undefined>(node.myVote);

  const indentColor = INDENT_COLORS[Math.min(node.depth, INDENT_COLORS.length - 1)];
  const cname = node.author?.displayName ?? node.author?.username ?? "?";
  const isAuthor = session?.user?.id === node.userId;
  const isContinueThread = node.depth >= 5 && node.children.length > 0;

  async function handleReply() {
    const text = replyText.trim();
    if (!text) return;
    try {
      const data = await apiFetch(`/clubs/${clubId}/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: text, parentId: node.id }),
      });
      const newComment: ClubComment = {
        ...data.data,
        author: {
          id: session?.user?.id,
          username: session?.user?.name,
          displayName: session?.user?.name,
          avatarUrl: session?.user?.image,
        },
      };
      onReplyAdded(newComment);
      setReplyText("");
      setReplying(false);
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  }

  function handleVote(value: 1 | -1) {
    const prev = localMyVote;
    const toggled = prev === value ? null : value;
    const delta = (toggled ?? 0) - (prev ?? 0);
    setLocalScore((s) => s + delta);
    setLocalMyVote(toggled);
    onVote(node.id, value, prev);
  }

  return (
    <div className={`${node.depth > 0 ? `pl-3 border-l-2 ${indentColor}` : ""}`}>
      <div className="flex gap-2 group/comment py-1.5">
        <VoteButtons score={localScore} myVote={localMyVote} onVote={handleVote} size="sm" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Avatar src={node.author?.avatarUrl} name={cname} size="sm" />
            <span className="text-xs font-semibold text-zinc-300">{cname}</span>
            <span className="text-xs text-zinc-600">{formatDate(node.createdAt)}</span>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">{node.content}</p>

          <div className="flex items-center gap-3 mt-1">
            {isMember && node.depth < 5 && (
              <button
                onClick={() => setReplying((v) => !v)}
                className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <CornerDownRight className="h-3 w-3" /> Reply
              </button>
            )}
            {node.children.length > 0 && (
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                {collapsed ? `Show ${node.children.length} repl${node.children.length > 1 ? "ies" : "y"}` : "Collapse"}
              </button>
            )}
          </div>

          {replying && (
            <div className="flex gap-2 mt-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleReply())}
                placeholder={`Reply to ${cname}...`}
                className="flex-1 bg-zinc-950/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all"
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim()}
                className="p-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 disabled:opacity-30 transition-all border border-purple-500/20"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setReplying(false)} className="p-2 rounded-lg text-zinc-600 hover:text-zinc-400 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {(isAuthor || isAdmin) && (
          <button
            onClick={() => onDelete(node.id)}
            className="opacity-0 group-hover/comment:opacity-100 p-1 rounded text-zinc-700 hover:text-red-400 transition-all self-start mt-1"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {!collapsed && !isContinueThread && node.children.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {node.children.map((child) => (
            <CommentNode
              key={child.id}
              node={child}
              clubId={clubId}
              postId={postId}
              session={session}
              isAdmin={isAdmin}
              isMember={isMember}
              onDelete={onDelete}
              onReplyAdded={onReplyAdded}
              onVote={onVote}
            />
          ))}
        </div>
      )}

      {isContinueThread && !collapsed && (
        <p className="text-xs text-purple-400 pl-3 mt-1 cursor-pointer hover:underline" onClick={() => setCollapsed(false)}>
          Continue this thread →
        </p>
      )}
    </div>
  );
}

// ─── Sort bar ─────────────────────────────────────────────────────────────────

type SortMode = "hot" | "new" | "top";
type Timeframe = "day" | "week" | "month" | "year" | "all";

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  all: "All Time",
};

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  club: Club;
  isMember: boolean;
  isAdmin: boolean;
  session: any;
  initialPosts: ClubPost[];
}

export function DiscussionsTab({ club, isMember, isAdmin, session, initialPosts }: Props) {
  const [posts, setPosts] = useState<ClubPost[]>(
    initialPosts.map((p) => ({
      ...p,
      score: p.score ?? 0,
      upvoteCount: p.upvoteCount ?? 0,
      downvoteCount: p.downvoteCount ?? 0,
      flair: p.flair ?? null,
      flairColor: p.flairColor ?? null,
    })),
  );

  // Sort state
  const [sort, setSort] = useState<SortMode>("hot");
  const [timeframe, setTimeframe] = useState<Timeframe>("week");
  const [sortLoading, setSortLoading] = useState(false);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFlair, setSelectedFlair] = useState<ClubFlair | null>(null);
  const [flairs, setFlairs] = useState<ClubFlair[]>([]);
  const [flairsLoaded, setFlairsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // Comments (flat list per post)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, ClubComment[]>>({});
  const [commentsLoaded, setCommentsLoaded] = useState<Record<string, boolean>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  // ── Load flairs when form opens
  async function loadFlairs() {
    if (flairsLoaded) return;
    try {
      const data = await apiFetch(`/clubs/${club.id}/flairs`);
      setFlairs(data.data ?? []);
      setFlairsLoaded(true);
    } catch {
      setFlairsLoaded(true);
    }
  }

  // ── Change sort
  async function changeSort(newSort: SortMode, newTimeframe?: Timeframe) {
    const tf = newTimeframe ?? timeframe;
    setSort(newSort);
    if (newTimeframe) setTimeframe(newTimeframe);
    setSortLoading(true);
    try {
      const qs = new URLSearchParams({ sort: newSort, limit: "30" });
      if (newSort === "top") qs.set("timeframe", tf);
      const data = await apiFetch(`/clubs/${club.id}/posts?${qs}`);
      setPosts((data.data ?? []).map((p: ClubPost) => ({
        ...p,
        score: p.score ?? 0,
        upvoteCount: p.upvoteCount ?? 0,
        downvoteCount: p.downvoteCount ?? 0,
        flair: p.flair ?? null,
        flairColor: p.flairColor ?? null,
      })));
    } catch (err: any) {
      toast.error(err.message ?? "Error loading posts");
    } finally {
      setSortLoading(false);
    }
  }

  // ── Create post
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/clubs/${club.id}/posts`, {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          flair: selectedFlair?.name ?? null,
          flairColor: selectedFlair?.color ?? null,
        }),
      });
      const newPost: ClubPost = {
        score: 0, upvoteCount: 0, downvoteCount: 0, flair: null, flairColor: null,
        ...data.data,
        user: { id: session?.user?.id, username: session?.user?.name, displayName: session?.user?.name, avatarUrl: session?.user?.image },
        commentsCount: 0,
      };
      setPosts((prev) => [newPost, ...prev]);
      setTitle("");
      setContent("");
      setSelectedFlair(null);
      setShowForm(false);
      toast.success("Discussion created!");
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  // ── Delete post
  async function handleDelete(postId: string) {
    if (!confirm("Delete this discussion?")) return;
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Discussion deleted.");
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  }

  // ── Pin
  async function handlePin(postId: string, pinned: boolean) {
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}/pin`, { method: "POST", body: JSON.stringify({ pinned }) });
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, isPinned: pinned } : p)));
      toast.success(pinned ? "Pinned!" : "Unpinned.");
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  }

  // ── Edit post
  async function handleSaveEdit(postId: string) {
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, title: editTitle, content: editContent } : p)));
      setEditingId(null);
      toast.success("Discussion updated.");
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  }

  // ── Vote post (optimistic)
  async function handlePostVote(postId: string, value: 1 | -1, currentVote: 1 | -1 | null | undefined) {
    const toggled = currentVote === value ? null : value;
    const delta = (toggled ?? 0) - (currentVote ?? 0);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, score: (p.score ?? 0) + delta, myVote: toggled as any }
          : p,
      ),
    );
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}/vote`, {
        method: "POST",
        body: JSON.stringify({ value }),
      });
    } catch {
      // revert
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, score: (p.score ?? 0) - delta, myVote: currentVote as any }
            : p,
        ),
      );
    }
  }

  // ── Toggle comments
  async function toggleComments(postId: string) {
    if (expandedId === postId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(postId);
    if (!commentsLoaded[postId]) {
      try {
        const data = await apiFetch(`/clubs/${club.id}/posts/${postId}/comments`);
        setCommentsByPost((prev) => ({ ...prev, [postId]: data.data ?? [] }));
        setCommentsLoaded((prev) => ({ ...prev, [postId]: true }));
      } catch {
        setCommentsByPost((prev) => ({ ...prev, [postId]: [] }));
        setCommentsLoaded((prev) => ({ ...prev, [postId]: true }));
      }
    }
  }

  // ── Add top-level comment
  async function handleAddComment(postId: string) {
    const text = (commentInput[postId] ?? "").trim();
    if (!text) return;
    try {
      const data = await apiFetch(`/clubs/${club.id}/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      const newComment: ClubComment = {
        ...data.data,
        score: data.data.score ?? 0,
        upvoteCount: data.data.upvoteCount ?? 0,
        downvoteCount: data.data.downvoteCount ?? 0,
        depth: data.data.depth ?? 0,
        parentId: data.data.parentId ?? null,
        author: { id: session?.user?.id, username: session?.user?.name, displayName: session?.user?.name, avatarUrl: session?.user?.image },
      };
      setCommentsByPost((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), newComment] }));
      setCommentInput((prev) => ({ ...prev, [postId]: "" }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 } : p));
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  }

  // ── Add reply (from CommentNode)
  function handleReplyAdded(postId: string, comment: ClubComment) {
    setCommentsByPost((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), comment] }));
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 } : p));
  }

  // ── Delete comment
  async function handleDeleteComment(postId: string, commentId: string) {
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
      // Remove comment and all its descendants
      setCommentsByPost((prev) => {
        const list = prev[postId] ?? [];
        const toRemove = new Set<string>();
        function collect(id: string) {
          toRemove.add(id);
          list.filter((c) => c.parentId === id).forEach((c) => collect(c.id));
        }
        collect(commentId);
        return { ...prev, [postId]: list.filter((c) => !toRemove.has(c.id)) };
      });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, commentsCount: Math.max(0, (p.commentsCount ?? 1) - 1) } : p));
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  }

  // ── Vote comment (optimistic)
  async function handleCommentVote(postId: string, commentId: string, value: 1 | -1, currentVote: 1 | -1 | null | undefined) {
    const toggled = currentVote === value ? null : value;
    const delta = (toggled ?? 0) - (currentVote ?? 0);
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? []).map((c) =>
        c.id === commentId ? { ...c, score: (c.score ?? 0) + delta, myVote: toggled as any } : c,
      ),
    }));
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}/comments/${commentId}/vote`, {
        method: "POST",
        body: JSON.stringify({ value }),
      });
    } catch {
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).map((c) =>
          c.id === commentId ? { ...c, score: (c.score ?? 0) - delta, myVote: currentVote as any } : c,
        ),
      }));
    }
  }

  // ── Sort posts client-side after initial load
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return Number(b.isPinned) - Number(a.isPinned);
    if (sort === "new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "top") return (b.score ?? 0) - (a.score ?? 0);
    // hot
    const hoursA = (Date.now() - new Date(a.createdAt).getTime()) / 3_600_000;
    const hoursB = (Date.now() - new Date(b.createdAt).getTime()) / 3_600_000;
    const hotA = (a.score ?? 0) / Math.pow(hoursA + 2, 1.5);
    const hotB = (b.score ?? 0) / Math.pow(hoursB + 2, 1.5);
    return hotB - hotA;
  });

  return (
    <div className="max-w-2xl space-y-3">
      {/* Sort bar */}
      <div className="flex items-center gap-1 mb-4">
        {(["hot", "new", "top"] as SortMode[]).map((s) => (
          <button
            key={s}
            onClick={() => changeSort(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${
              sort === s
                ? "bg-purple-600 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            }`}
          >
            {s === "hot" ? "🔥 Hot" : s === "new" ? "✨ New" : "⬆️ Top"}
          </button>
        ))}
        {sort === "top" && (
          <select
            value={timeframe}
            onChange={(e) => changeSort("top", e.target.value as Timeframe)}
            className="ml-2 bg-zinc-900 border border-white/10 rounded-full px-3 py-1 text-xs text-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
          >
            {(Object.entries(TIMEFRAME_LABELS) as [Timeframe, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        )}
        {sortLoading && <Loader2 className="h-3.5 w-3.5 text-zinc-600 animate-spin ml-2" />}
      </div>

      {/* Create post button / form */}
      {isMember && (
        <div className="mb-6">
          {!showForm ? (
            <button
              onClick={() => { setShowForm(true); loadFlairs(); }}
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
            <div className="rounded-2xl border border-white/5 overflow-hidden shadow-2xl" style={{ background: "rgba(24,24,27,0.6)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                <span className="text-sm font-semibold text-zinc-400">New Discussion</span>
                <button onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors p-0.5 rounded-md hover:bg-white/5">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-3">
                <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={150} placeholder="Discussion title" className={inputCls} />
                <textarea value={content} onChange={(e) => setContent(e.target.value)} required minLength={1} maxLength={5000} rows={4} placeholder="What do you want to discuss?" className={`${inputCls} resize-none`} />

                {/* Flair selector */}
                {flairs.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-xs text-zinc-600 self-center">Flair:</span>
                    {flairs.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFlair(selectedFlair?.id === f.id ? null : f)}
                        className="transition-all"
                        style={{ opacity: selectedFlair && selectedFlair.id !== f.id ? 0.4 : 1 }}
                      >
                        <FlairBadge name={f.name} color={f.color} />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={loading} className={btnPrimaryCls} style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Publish
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className={btnGhostCls}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {sortedPosts.length === 0 ? (
        <EmptyState icon={MessageSquare} text="No discussions yet. Be the first!" />
      ) : (
        sortedPosts.map((post) => {
          const name = post.user?.displayName ?? post.user?.username ?? post.author?.displayName ?? post.author?.username ?? "?";
          const authorId = post.userId ?? (post.author as any)?.id;
          const isAuthor = session?.user?.id === authorId;
          const isExpanded = expandedId === post.id;
          const isEditing = editingId === post.id;
          const tree = buildCommentTree(commentsByPost[post.id] ?? []);

          return (
            <div
              key={post.id}
              className="group/post relative rounded-2xl border transition-all duration-300 hover:border-white/10 overflow-hidden backdrop-blur-md"
              style={{
                borderColor: post.isPinned ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.05)",
                background: post.isPinned ? "rgba(168,85,247,0.04)" : "rgba(24,24,27,0.4)",
                boxShadow: post.isPinned ? "0 4px 24px -4px rgba(168,85,247,0.15)" : "0 4px 24px -4px rgba(0,0,0,0.3)",
              }}
            >
              <div className="p-5 relative z-10">
                {isEditing ? (
                  <div className="space-y-3">
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={inputCls} />
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} className={`${inputCls} resize-none`} />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(post.id)} className={btnPrimaryCls} style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                        <Check className="h-3.5 w-3.5" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className={btnGhostCls}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    {/* Vote column */}
                    <div className="pt-1">
                      <VoteButtons
                        score={post.score ?? 0}
                        myVote={post.myVote}
                        onVote={(v) => handlePostVote(post.id, v, post.myVote)}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {post.isPinned && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-400">
                            <Pin className="h-3 w-3" /> Pinned
                          </span>
                        )}
                        {post.flair && post.flairColor && (
                          <FlairBadge name={post.flair} color={post.flairColor} />
                        )}
                        <span className="font-semibold text-base text-white leading-snug">{post.title}</span>
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed mt-1">{post.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                        <Avatar src={post.user?.avatarUrl ?? post.author?.avatarUrl} name={name} size="sm" />
                        <span className="font-medium text-zinc-400">{name}</span>
                        <span className="text-zinc-700">·</span>
                        <span>{formatDate(post.createdAt)}</span>
                        <button onClick={() => toggleComments(post.id)} className="flex items-center gap-1 hover:text-zinc-400 transition-colors ml-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{post.commentsCount ?? 0}</span>
                        </button>
                      </div>
                    </div>

                    {(isAuthor || isAdmin) && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isAuthor && (
                          <button
                            onClick={() => { setEditingId(post.id); setEditTitle(post.title); setEditContent(post.content); }}
                            className="p-1.5 rounded-lg text-zinc-700 hover:text-zinc-300 hover:bg-white/5 transition-all"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handlePin(post.id, !post.isPinned)}
                            className={`p-1.5 rounded-lg transition-all ${post.isPinned ? "text-purple-400 bg-purple-400/10" : "text-zinc-700 hover:text-purple-400 hover:bg-white/5"}`}
                          >
                            {post.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-950/20 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isExpanded && !isEditing && (
                <div className="border-t border-white/5" style={{ background: "rgba(0,0,0,0.2)" }}>
                  {!commentsLoaded[post.id] ? (
                    <div className="flex items-center gap-2 p-4 text-zinc-600 text-xs">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading comments...
                    </div>
                  ) : (
                    <div className="px-4 py-4 space-y-2">
                      {tree.length === 0 && (
                        <p className="text-xs text-zinc-700 py-1">No comments yet.</p>
                      )}
                      {tree.map((node) => (
                        <CommentNode
                          key={node.id}
                          node={node}
                          clubId={club.id}
                          postId={post.id}
                          session={session}
                          isAdmin={isAdmin}
                          isMember={isMember}
                          onDelete={(id) => handleDeleteComment(post.id, id)}
                          onReplyAdded={(c) => handleReplyAdded(post.id, c)}
                          onVote={(commentId, value, current) => handleCommentVote(post.id, commentId, value, current)}
                        />
                      ))}
                      {isMember && (
                        <div className="flex gap-2 pt-2 border-t border-white/5">
                          <input
                            value={commentInput[post.id] ?? ""}
                            onChange={(e) => setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleAddComment(post.id))}
                            placeholder="Write a comment..."
                            className="flex-1 bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 transition-all font-medium"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!(commentInput[post.id] ?? "").trim()}
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
  );
}
