"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { resolveImage } from "@/lib/utils";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PageHeader } from "@/components/ui/page-header";
import { MessageSquare, Loader2, ArrowLeft, AlertTriangle, CheckCircle, XCircle, Ban, Trash2, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface ReportDetailData {
  report: {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    description: string | null;
    status: string;
    priority: string;
    createdAt: string;
    resolvedAt: string | null;
  };
  reporter: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    email: string;
  } | null;
  content: Record<string, unknown> | null;
}

const REASON_LABELS: Record<string, string> = {
  spam: "Spam", harassment: "Assédio", inappropriate: "Inapropriado",
  copyright: "Direitos Autorais", other: "Outro",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "text-zinc-400 bg-zinc-800/60 border-zinc-700",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
};

export function ReportDetail({ reportId }: { reportId: string }) {
  const [data, setData] = useState<ReportDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: ReportDetailData }>(`/admin/reports/${reportId}`);
      setData(res.data);
    } catch {
      setError("Falha ao carregar report.");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (status: "resolved" | "dismissed") => {
    setActing(true);
    try {
      await apiFetch(`/admin/reports/${reportId}/resolve`, { method: "PATCH", body: { status } });
      setData((prev) => prev ? { ...prev, report: { ...prev.report, status } } : prev);
    } catch {
      setError("Falha ao resolver report.");
    } finally {
      setActing(false);
    }
  };

  const takeAction = async (action: "ban_user" | "delete_content") => {
    setActing(true);
    try {
      await apiFetch(`/admin/reports/${reportId}/action`, { method: "POST", body: { action } });
      setData((prev) => prev ? { ...prev, report: { ...prev.report, status: "resolved" } } : prev);
    } catch {
      setError("Falha ao executar ação.");
    } finally {
      setActing(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const isPending = data?.report.status === "pending" || data?.report.status === "investigating";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <Link href="/discussions" className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Denúncias
        </Link>
        <PageHeader section="Discussions" title="Detalhes da Denúncia" icon={MessageSquare} />
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : !data ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report info */}
          <div className="lg:col-span-2 space-y-5">
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full border border-white/10 bg-white/5 capitalize">
                      {data.report.targetType}
                    </span>
                    <span className="text-xs font-medium text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/10">
                      {REASON_LABELS[data.report.reason] || data.report.reason}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${PRIORITY_STYLES[data.report.priority] ?? PRIORITY_STYLES.medium}`}>
                      {data.report.priority}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${data.report.status === "pending" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : data.report.status === "resolved" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-zinc-400 bg-zinc-800/60 border-zinc-700"}`}>
                      {data.report.status}
                    </span>
                  </div>

                  {data.report.description && (
                    <p className="text-sm text-zinc-300 leading-relaxed">{data.report.description}</p>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Clock className="w-3.5 h-3.5" /> {formatDate(data.report.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Reported content preview */}
            {data.content && (
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Conteúdo Reportado</h3>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
                  {Object.entries(data.content)
                    .filter(([k]) => ["content", "text", "body", "name", "title", "description", "bio"].includes(k))
                    .map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs text-zinc-600 capitalize mb-0.5">{k}</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">{String(v)}</p>
                      </div>
                    ))}
                  <p className="text-xs text-zinc-600 font-mono pt-2">ID: {data.report.targetId}</p>
                </div>
              </div>
            )}
          </div>

          {/* Reporter + Actions */}
          <div className="space-y-5">
            {/* Reporter */}
            {data.reporter && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Reportado por</h3>
                <Link href={`/community/${data.reporter.id}`} className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 overflow-hidden relative shrink-0">
                    {data.reporter.avatarUrl ? (
                      <Image src={resolveImage(data.reporter.avatarUrl) ?? ""} fill alt="" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-sm font-bold text-zinc-400">
                          {(data.reporter.displayName || data.reporter.email)?.[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-accent transition-colors truncate">
                      {data.reporter.displayName || data.reporter.username || "—"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{data.reporter.email}</p>
                  </div>
                </Link>
              </div>
            )}

            {/* Actions */}
            {isPending && (
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ações</h3>

                {acting ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => resolve("resolved")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" /> Resolver
                    </button>
                    <button
                      onClick={() => resolve("dismissed")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Descartar
                    </button>
                    {data.report.targetType !== "user" && (
                      <button
                        onClick={() => takeAction("delete_content")}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Deletar Conteúdo
                      </button>
                    )}
                    {data.report.targetType === "user" && (
                      <button
                        onClick={() => takeAction("ban_user")}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                      >
                        <Ban className="w-4 h-4" /> Banir Usuário
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
