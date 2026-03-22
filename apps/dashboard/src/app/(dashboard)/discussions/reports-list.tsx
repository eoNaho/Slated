"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, RefreshCw, Clock, ArrowRight, Loader2,
  ChevronDown, UserCheck, Flame, EyeOff, Trash2, Ban,
  ShieldAlert, XCircle, Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { resolveImage } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";
import Link from "next/link";
import Image from "next/image";

interface Reporter {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

interface QueueReport {
  report: {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    description?: string | null;
    status: string;
    priority: string;
    assignedTo: string | null;
    createdAt: string;
  };
  reporter: Reporter | null;
  reportCount: number;
}

interface QueueResponse {
  data: { pending: number; investigating: number; reports: QueueReport[] };
  page: number;
  limit: number;
}

type StatusFilter = "pending" | "investigating" | "resolved" | "dismissed";
type QuickAction = "warn" | "hide_content" | "delete_content" | "suspend_user" | "ban_user" | "dismiss";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "pending",       label: "Pendentes" },
  { key: "investigating", label: "Investigando" },
  { key: "resolved",      label: "Resolvidos" },
  { key: "dismissed",     label: "Descartados" },
];

const REASON_LABELS: Record<string, string> = {
  spam: "Spam", harassment: "Assédio", inappropriate: "Inapropriado",
  copyright: "Direitos Autorais", hate_speech: "Discurso de Ódio",
  misinformation: "Desinformação", impersonation: "Impersonação",
  self_harm: "Autolesão", other: "Outro",
};

const PRIORITY: Record<string, { badge: string; dot: string }> = {
  low:      { badge: "text-zinc-400 bg-zinc-800/60 border-zinc-700",          dot: "bg-zinc-500" },
  medium:   { badge: "text-amber-400 bg-amber-500/10 border-amber-500/20",    dot: "bg-amber-400" },
  high:     { badge: "text-orange-400 bg-orange-500/10 border-orange-500/20", dot: "bg-orange-400" },
  critical: { badge: "text-red-400 bg-red-500/10 border-red-500/20",          dot: "bg-red-500 animate-pulse" },
};

const TARGET_LABELS: Record<string, string> = {
  review: "Review", comment: "Comentário", list: "Lista", user: "Usuário", story: "Story",
};

const QUICK_ACTIONS: { action: QuickAction; label: string; icon: React.ElementType; color: string; only?: string[] }[] = [
  { action: "dismiss",        label: "Descartar",  icon: XCircle,     color: "text-zinc-400" },
  { action: "warn",           label: "Avisar",     icon: ShieldAlert, color: "text-amber-400" },
  { action: "hide_content",   label: "Ocultar",    icon: EyeOff,      color: "text-blue-400",   only: ["review","comment","story","list"] },
  { action: "delete_content", label: "Deletar",    icon: Trash2,      color: "text-red-400",    only: ["review","comment","story","list"] },
  { action: "suspend_user",   label: "Suspender",  icon: Users,       color: "text-orange-400", only: ["user"] },
  { action: "ban_user",       label: "Banir",      icon: Ban,         color: "text-red-400",    only: ["user"] },
];

export function ReportsList() {
  const [reports, setReports] = useState<QueueReport[]>([]);
  const [counts, setCounts] = useState({ pending: 0, investigating: 0 });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<QueueResponse>(
        `/moderation/queue?status=${statusFilter}&page=${p}&limit=20`
      );
      const items = res.data.reports ?? [];
      setReports((prev) => (p === 1 ? items : [...prev, ...items]));
      setCounts({ pending: res.data.pending, investigating: res.data.investigating });
      setHasMore(items.length === 20);
      setPage(p);
    } catch {
      setError("Falha ao carregar fila de moderação.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const assignToMe = async (reportId: string) => {
    try {
      await apiFetch(`/moderation/reports/${reportId}/assign`, { method: "POST", body: {} });
      setReports((prev) =>
        prev.map((r) =>
          r.report.id === reportId
            ? { ...r, report: { ...r.report, status: "investigating", assignedTo: "me" } }
            : r
        )
      );
    } catch {
      setError("Falha ao assumir report.");
    }
  };

  const quickResolve = async (reportId: string, action: QuickAction) => {
    setActing(reportId);
    setOpenMenu(null);
    try {
      await apiFetch(`/moderation/reports/${reportId}/resolve`, {
        method: "POST",
        body: { action, reason: `Ação rápida: ${action}` },
      });
      setReports((prev) => prev.filter((r) => r.report.id !== reportId));
    } catch {
      setError("Falha ao executar ação.");
    } finally {
      setActing(null);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const isActive = statusFilter === "pending" || statusFilter === "investigating";

  return (
    <div className="space-y-8 animate-in fade-in duration-500" onClick={() => setOpenMenu(null)}>
      <PageHeader
        section="Discussions"
        title="Fila de Moderação"
        icon={MessageSquare}
        actions={
          <button onClick={() => load(1)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.key ? "bg-accent text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
          >
            {tab.label}
            {tab.key === "pending" && counts.pending > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">
                {counts.pending}
              </span>
            )}
            {tab.key === "investigating" && counts.investigating > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-amber-500 text-white rounded-full px-1.5 py-0.5">
                {counts.investigating}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading && page === 1 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-sm">
          <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
          <p>Nenhum report {statusFilter === "pending" ? "pendente" : statusFilter}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(({ report, reporter, reportCount }) => {
            const p = PRIORITY[report.priority] ?? PRIORITY.medium;
            return (
              <div key={report.id} className="glass-card rounded-xl p-4 flex gap-4 items-center">
                <div className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
                      {TARGET_LABELS[report.targetType] ?? report.targetType}
                    </span>
                    <span className="text-xs font-medium text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/10">
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${p.badge}`}>
                      {report.priority}
                    </span>
                    {reportCount > 1 && (
                      <span className="flex items-center gap-1 text-xs font-bold text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 bg-rose-500/10">
                        <Flame className="w-3 h-3" /> {reportCount}×
                      </span>
                    )}
                    {report.assignedTo && (
                      <span className="flex items-center gap-1 text-xs text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10">
                        <UserCheck className="w-3 h-3" /> Atribuído
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {reporter && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-zinc-800 overflow-hidden relative shrink-0">
                          {reporter.avatarUrl ? (
                            <Image src={resolveImage(reporter.avatarUrl) ?? ""} fill alt="" className="object-cover" sizes="16px" />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-zinc-400">
                              {(reporter.displayName ?? reporter.username)?.[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">
                          {reporter.displayName ?? reporter.username ?? "Desconhecido"}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-zinc-600">
                      <Clock className="w-3 h-3" /> {fmt(report.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isActive && !report.assignedTo && (
                    <button
                      onClick={() => assignToMe(report.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Assumir
                    </button>
                  )}

                  {isActive && (
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === report.id ? null : report.id)}
                        disabled={acting === report.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        {acting === report.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <>Ações <ChevronDown className="w-3 h-3" /></>
                        }
                      </button>
                      {openMenu === report.id && (
                        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-white/10 bg-zinc-900 shadow-2xl py-1">
                          {QUICK_ACTIONS.filter((a) => !a.only || a.only.includes(report.targetType)).map((a) => {
                            const Icon = a.icon;
                            return (
                              <button
                                key={a.action}
                                onClick={() => quickResolve(report.id, a.action)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium ${a.color} hover:bg-white/5 transition-colors`}
                              >
                                <Icon className="w-3.5 h-3.5" /> {a.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <Link
                    href={`/discussions/${report.id}`}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
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
