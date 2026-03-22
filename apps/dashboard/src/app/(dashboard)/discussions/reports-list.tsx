"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, CheckCircle, XCircle, Loader2,
  RefreshCw, AlertTriangle, Clock,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";

interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  description?: string | null;
  status: "pending" | "resolved" | "dismissed";
  createdAt: string;
}

type StatusFilter = "pending" | "resolved" | "dismissed";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "pending", label: "Pendentes" },
  { key: "resolved", label: "Resolvidos" },
  { key: "dismissed", label: "Descartados" },
];

const REASON_LABELS: Record<string, string> = {
  spam: "Spam", harassment: "Assédio", spoiler: "Spoiler",
  inappropriate: "Inapropriado", misinformation: "Desinformação", other: "Outro",
};

export function ReportsList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Report[] }>(`/admin/reports?status=${statusFilter}`);
      setReports(res.data);
    } catch {
      setError("Falha ao carregar reports.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string, status: "resolved" | "dismissed") => {
    setResolving(id);
    try {
      await apiFetch(`/admin/reports/${id}/resolve`, { method: "PATCH", body: { status } });
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Falha ao resolver report.");
    } finally {
      setResolving(null);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="Discussions"
        title="Moderação"
        icon={MessageSquare}
        actions={
          <button onClick={load} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === tab.key ? "bg-accent text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-sm">
          <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
          <p>Nenhum report {statusFilter === "pending" ? "pendente" : statusFilter === "resolved" ? "resolvido" : "descartado"}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="glass-card rounded-2xl p-5 flex gap-4 items-start">
              <div className="shrink-0 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full border border-white/10 bg-white/5 capitalize">{report.targetType}</span>
                  <span className="text-xs font-medium text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/10">
                    {REASON_LABELS[report.reason] || report.reason}
                  </span>
                  <span className="text-xs text-zinc-600 font-mono">{report.targetId.slice(0, 8)}…</span>
                </div>
                {report.description && <p className="text-sm text-zinc-400 line-clamp-2">{report.description}</p>}
                <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <Clock className="w-3 h-3" />
                  {formatDate(report.createdAt)}
                </div>
              </div>
              {statusFilter === "pending" && (
                <div className="shrink-0 flex items-center gap-2">
                  {resolving === report.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                  ) : (
                    <>
                      <button onClick={() => resolve(report.id, "resolved")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Resolver
                      </button>
                      <button onClick={() => resolve(report.id, "dismissed")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Descartar
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
