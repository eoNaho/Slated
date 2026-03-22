"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  MessageSquare, Plus, X, Send, Loader2, Pin, PinOff, Pencil, Trash2, Check,
} from "lucide-react";
import type { Club, ClubPost } from "@/lib/queries/clubs";
import {
  apiFetch, inputCls, btnPrimaryCls, btnGhostCls,
  Avatar, EmptyState, formatDate,
} from "../shared/club-ui";

interface Props {
  club: Club;
  isMember: boolean;
  isAdmin: boolean;
  session: any;
  initialPosts: ClubPost[];
}

export function DiscussionsTab({ club, isMember, isAdmin, session, initialPosts }: Props) {
  const [posts, setPosts] = useState<any[]>(initialPosts);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // Comments
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentsLoaded, setCommentsLoaded] = useState<Record<string, boolean>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/clubs/${club.id}/posts`, {
        method: "POST",
        body: JSON.stringify({ title, content }),
      });
      setPosts((prev) => [
        {
          ...data.data,
          user: {
            id: session?.user?.id,
            username: session?.user?.name,
            displayName: session?.user?.name,
            avatarUrl: session?.user?.image,
          },
          commentsCount: 0,
        },
        ...prev,
      ]);
      setTitle("");
      setContent("");
      setShowForm(false);
      toast.success("Discussão criada!");
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm("Deletar esta discussão?")) return;
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Discussão deletada.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    }
  }

  async function handlePin(postId: string, pinned: boolean) {
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}/pin`, {
        method: "POST",
        body: JSON.stringify({ pinned }),
      });
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, isPinned: pinned } : p)));
      toast.success(pinned ? "Fixado!" : "Desafixado.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    }
  }

  async function handleSaveEdit(postId: string) {
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, title: editTitle, content: editContent } : p,
        ),
      );
      setEditingId(null);
      toast.success("Discussão atualizada.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    }
  }

  async function toggleComments(postId: string) {
    if (expandedId === postId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(postId);
    if (!commentsLoaded[postId]) {
      try {
        const data = await apiFetch(`/clubs/${club.id}/posts/${postId}/comments`);
        setComments((prev) => ({ ...prev, [postId]: data.data ?? [] }));
        setCommentsLoaded((prev) => ({ ...prev, [postId]: true }));
      } catch {
        setCommentsLoaded((prev) => ({ ...prev, [postId]: true }));
      }
    }
  }

  async function handleAddComment(postId: string) {
    const text = (commentInput[postId] ?? "").trim();
    if (!text) return;
    try {
      const data = await apiFetch(`/clubs/${club.id}/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      const newComment = {
        ...data.data,
        author: {
          id: session?.user?.id,
          username: session?.user?.name,
          displayName: session?.user?.name,
          avatarUrl: session?.user?.image,
        },
      };
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), newComment] }));
      setCommentInput((prev) => ({ ...prev, [postId]: "" }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 } : p,
        ),
      );
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    }
  }

  async function handleDeleteComment(postId: string, commentId: string) {
    try {
      await apiFetch(`/clubs/${club.id}/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
      setComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((c: any) => c.id !== commentId),
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentsCount: Math.max(0, (p.commentsCount ?? 1) - 1) } : p,
        ),
      );
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    }
  }

  return (
    <div className="max-w-2xl space-y-3">
      {isMember && (
        <div className="mb-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="group relative flex items-center gap-4 w-full text-left px-6 py-5 rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all text-sm font-medium overflow-hidden backdrop-blur-md"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 border border-purple-500/20 transition-all">
                <Plus className="h-5 w-5 text-purple-400" />
              </div>
              <span className="relative z-10 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                Iniciar uma discussão...
              </span>
            </button>
          ) : (
            <div className="rounded-2xl border border-white/5 overflow-hidden shadow-2xl" style={{ background: "rgba(24,24,27,0.6)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                <span className="text-sm font-semibold text-zinc-400">Nova Discussão</span>
                <button onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors p-0.5 rounded-md hover:bg-white/5">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-3">
                <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={150} placeholder="Título da discussão" className={inputCls} />
                <textarea value={content} onChange={(e) => setContent(e.target.value)} required minLength={1} maxLength={5000} rows={4} placeholder="O que você quer discutir?" className={`${inputCls} resize-none`} />
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={loading} className={btnPrimaryCls} style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Publicar
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className={btnGhostCls}>Cancelar</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {posts.length === 0 ? (
        <EmptyState icon={MessageSquare} text="Nenhuma discussão ainda. Seja o primeiro!" />
      ) : (
        [...posts]
          .sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
          .map((post) => {
            const name = post.user?.displayName ?? post.user?.username ?? post.author?.displayName ?? post.author?.username ?? "?";
            const authorId = post.userId ?? post.author?.id;
            const isAuthor = session?.user?.id === authorId;
            const isExpanded = expandedId === post.id;
            const isEditing = editingId === post.id;

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
                          <Check className="h-3.5 w-3.5" /> Salvar
                        </button>
                        <button onClick={() => setEditingId(null)} className={btnGhostCls}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <Avatar src={post.user?.avatarUrl ?? post.author?.avatarUrl} name={name} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {post.isPinned && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-400">
                              <Pin className="h-3 w-3" /> Fixado
                            </span>
                          )}
                          <span className="font-semibold text-base text-white leading-snug">{post.title}</span>
                        </div>
                        <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed mt-1">{post.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
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
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando comentários...
                      </div>
                    ) : (
                      <div className="px-4 py-4 space-y-3">
                        {(comments[post.id] ?? []).length === 0 && (
                          <p className="text-xs text-zinc-700 py-1">Nenhum comentário ainda.</p>
                        )}
                        {(comments[post.id] ?? []).map((c: any) => {
                          const cname = c.author?.displayName ?? c.author?.username ?? "?";
                          const isCommentAuthor = session?.user?.id === c.userId;
                          return (
                            <div key={c.id} className="flex gap-3 group">
                              <Avatar src={c.author?.avatarUrl} name={cname} size="sm" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xs font-semibold text-zinc-300">{cname}</span>
                                  <span className="text-xs text-zinc-600">{formatDate(c.createdAt)}</span>
                                </div>
                                <p className="text-sm text-zinc-400 leading-relaxed mt-0.5">{c.content}</p>
                              </div>
                              {(isCommentAuthor || isAdmin) && (
                                <button
                                  onClick={() => handleDeleteComment(post.id, c.id)}
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
                              onChange={(e) => setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleAddComment(post.id))}
                              placeholder="Escreva um comentário..."
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
