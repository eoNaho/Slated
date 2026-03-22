"use client";

import { useState, useEffect, useCallback } from "react";
import { Flag, RefreshCw, Loader2, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";

interface ContentFlag {
  id: string;
  targetType: string;
  targetId: string;
  flagType: string;
  severity: string;
  details: string | null;
  autoActioned: boolean;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
}

interface FlagsResponse {
  data: ContentFlag[];
  page: number;
  limit: number;
}

const SEVERITY_STYLES: Record<string, string> = {
  low:    "text-zinc-400 bg-zinc-800/60 border-zinc-700",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  high:   "text-red-400 bg-red-500/10 border-red-500/20",
};

const FLAG_TYPE_LABELS: Record<string, string> = {
  profanity:  "Palavrão",
  spam:       "Spam",
  nsfw:       "NSFW",
  rate_spam:  "Rate Spam",
};

const TARGET_LABELS: Record<string, string> = {
  review: "Review", comment: "Comentário", story: "Story", image: "Imagem",
};

type StatusFilter = "pending" | "confirmed" | "dismissed";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "pending",   label: "Pendentes" },
  { key: "confirmed", label: "Confirmadas" },
  { key: "dismissed", label: "Descartadas" },
];

export function FlagsList() {
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<FlagsResponse>(
        `/moderation/flags?status=${statusFilter}&page=${p}&limit=25`
      );
      const items = res.data ?? [];
      setFlags((prev) => (p === 1 ? items : [...prev, ...items]));
      setHasMore(items.length === 25);
      setPage(p);
    } catch {
      setError("Falha ao carregar flags.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const review = async (flagId: string, status: "confirmed" | "dismissed") => {
    setActing(flagId);
    try {
      await apiFetch(`/moderation/flags/${flagId}`, {
        method: "PATCH",
        body: { status },
      });
      setFlags((prev) => prev.filter((f) => f.id !== flagId));
    } catch {
      setError("Falha ao atualizar flag.");
    } finally {
      setActing(null);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const parseDetails = (raw: string | null) => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="Discussions"
        title="Flags Automáticas"
        icon={Flag}
        actions={
          <button onClick={() => load(1)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.key ? "bg-accent text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading && page === 1 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : flags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-sm">
          <Flag className="w-10 h-10 mb-3 opacity-30" />
          <p>Nenhuma flag {statusFilter}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map((flag) => {
            const details = parseDetails(flag.details);
            return (
              <div key={flag.id} className="glass-card rounded-xl p-4 flex gap-4 items-center">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
                      {TARGET_LABELS[flag.targetType] ?? flag.targetType}
                    </span>
                    <span className="text-xs font-medium text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/10">
                      {FLAG_TYPE_LABELS[flag.flagType] ?? flag.flagType}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[flag.severity] ?? SEVERITY_STYLES.medium}`}>
                      {flag.severity}
                    </span>
                    {flag.autoActioned && (
                      <span className="flex items-center gap-1 text-xs text-teal-400 px-2 py-0.5 rounded-full border border-teal-500/20 bg-teal-500/10">
                        <Zap className="w-3 h-3" /> Auto-ocultado
                      </span>
                    )}
                  </div>

                  {details?.matchedTerms && (
                    <div className="flex gap-1 flex-wrap">
                      {(details.matchedTerms as string[]).slice(0, 5).map((t: string) => (
                        <span key={t} className="text-[10px] text-zinc-600 font-mono px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/5">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-xs text-zinc-600">
                    <Clock className="w-3 h-3" /> {fmt(flag.createdAt)}
                    <span className="text-zinc-700 font-mono ml-2">{flag.targetId.slice(0, 8)}…</span>
                  </div>
                </div>

                {statusFilter === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    {acting === flag.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                    ) : (
                      <>
                        <button
                          onClick={() => review(flag.id, "confirmed")}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Confirmar
                        </button>
                        <button
                          onClick={() => review(flag.id, "dismissed")}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Dispensar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {hasMore && (
            <button
              onClick={() => load(page + 1)}
              disabled={loading}
              className="w-full py-3 text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Carregar mais"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
