"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, RefreshCw, MessageSquare, AlertCircle, Edit2, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { resolveImage } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";
import Image from "next/image";
import Link from "next/link";
import { EditReviewModal } from "./edit-review-modal";

export interface ReviewItem {
  id: string;
  userId: string;
  mediaId: string;
  content: string;
  rating?: number;
  containsSpoilers: boolean;
  isHidden: boolean;
  hiddenReason?: string;
  createdAt: string;
}

export interface ReviewAuthor {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
}

interface DiscussionResult {
  review: ReviewItem;
  author: ReviewAuthor;
}

export function SearchDiscussions() {
  const [results, setResults] = useState<DiscussionResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<DiscussionResult | null>(null);
  
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("q", search);
      const res = await apiFetch<{ data: DiscussionResult[]; total: number }>(`/admin/discussions?${params}`);
      setResults(res.data);
      setTotal(res.total);
    } catch {
      setError("Falha ao buscar discussões.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (search || page > 1 || results.length === 0) {
      load();
    }
  }, [load, search, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="Moderation"
        title="Buscar Discussões"
        icon={Search}
        badge={total}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/discussions"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-all"
            >
              Ir para Fila de Moderação
            </Link>
          </div>
        }
      />

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Pesquisar por trechos que violam regras (ex: palavrões, spoilers)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent/40 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Pesquisar"}
        </button>
      </form>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="space-y-4">
        {results.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-sm glass-card rounded-2xl">
            <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
            <p>Nenhuma discussão encontrada.</p>
          </div>
        )}

        {results.map(({ review, author }) => (
          <div key={review.id} className={`glass-card rounded-xl p-5 border ${review.isHidden ? 'border-red-500/20 bg-red-500/5' : 'border-white/5'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative">
                  {author?.avatarUrl ? (
                    <Image
                      src={resolveImage(author.avatarUrl) ?? ""}
                      fill
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-zinc-400">
                      {(author?.displayName || author?.username || "?")[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {author?.displayName || author?.username}
                    </span>
                    {review.rating != null && (
                      <span className="text-xs text-amber-400 font-medium">
                        ⭐ {review.rating}
                      </span>
                    )}
                    {review.containsSpoilers && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                        SPOILER
                      </span>
                    )}
                    {review.isHidden && (
                      <span className="px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] font-bold bg-red-500/20 text-red-400">
                        <ShieldAlert className="w-3 h-3" /> MODERADO
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(review.createdAt).toLocaleDateString("pt-BR", {
                      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setEditingReview({ review, author })}
                className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs font-medium text-zinc-300 transition-colors flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5" /> Moderar
              </button>
            </div>

            <div className="mt-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {review.content}
            </div>

            {review.isHidden && review.hiddenReason && (
              <div className="mt-4 flex items-start gap-2 text-xs text-red-300 bg-red-950/30 border border-red-500/20 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <div>
                  <span className="font-semibold block mb-0.5">Motivo da remoção:</span>
                  {review.hiddenReason}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 border border-white/10 disabled:opacity-30 transition-colors"
          >
            Anterior
          </button>
          <span className="text-sm text-zinc-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 border border-white/10 disabled:opacity-30 transition-colors"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Modals */}
      <EditReviewModal
        open={!!editingReview}
        onOpenChange={(open) => !open && setEditingReview(null)}
        review={editingReview?.review || null}
        onSuccess={(updatedReview) => {
          setResults((prev) =>
            prev.map((r) =>
              r.review.id === updatedReview.id ? { ...r, review: { ...r.review, ...updatedReview } } : r
            )
          );
        }}
      />
    </div>
  );
}
