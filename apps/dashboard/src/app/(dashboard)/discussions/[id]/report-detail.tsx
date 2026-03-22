"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { resolveImage } from "@/lib/utils";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PageHeader } from "@/components/ui/page-header";
import {
  MessageSquare, Loader2, ArrowLeft, AlertTriangle, Clock,
  UserCheck, EyeOff, Eye, Trash2, Ban, ShieldAlert, XCircle,
  Users, CheckCircle,
} from "lucide-react";
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
    assignedTo: string | null;
    resolutionNote: string | null;
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
  copyright: "Direitos Autorais", hate_speech: "Discurso de Ódio",
  misinformation: "Desinformação", impersonation: "Impersonação",
  self_harm: "Autolesão", other: "Outro",
};

const PRIORITY_STYLES: Record<string, string> = {
  low:      "text-zinc-400 bg-zinc-800/60 border-zinc-700",
  medium:   "text-amber-400 bg-amber-500/10 border-amber-500/20",
  high:     "text-orange-400 bg-orange-500/10 border-orange-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
};

const STATUS_STYLES: Record<string, string> = {
  pending:       "text-amber-400 bg-amber-500/10 border-amber-500/20",
  investigating: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  resolved:      "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  dismissed:     "text-zinc-400 bg-zinc-800/60 border-zinc-700",
};

type Action = "warn" | "hide_content" | "restore_content" | "delete_content" | "suspend_user" | "ban_user" | "dismiss";

interface ActionDef {
  action: Action;
  label: string;
  icon: React.ElementType;
  style: string;
  only?: string[];
  confirm?: boolean;
}

const ACTIONS: ActionDef[] = [
  { action: "warn",            label: "Avisar usuário",    icon: ShieldAlert,   style: "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20" },
  { action: "hide_content",    label: "Ocultar conteúdo",  icon: EyeOff,        style: "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20",   only: ["review","comment","story","list"] },
  { action: "restore_content", label: "Restaurar",         icon: Eye,           style: "text-teal-400 bg-teal-500/10 border-teal-500/20 hover:bg-teal-500/20",   only: ["review","comment","story","list"] },
  { action: "delete_content",  label: "Deletar conteúdo",  icon: Trash2,        style: "text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20",       only: ["review","comment","story","list"], confirm: true },
  { action: "suspend_user",    label: "Suspender usuário", icon: Users,         style: "text-orange-400 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20", only: ["user"], confirm: true },
  { action: "ban_user",        label: "Banir usuário",     icon: Ban,           style: "text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20",       only: ["user"], confirm: true },
  { action: "dismiss",         label: "Descartar report",  icon: XCircle,       style: "text-zinc-400 bg-zinc-800/60 border-zinc-700 hover:bg-zinc-800" },
];

export function ReportDetail({ reportId }: { reportId: string }) {
  const [data, setData] = useState<ReportDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<Action | null>(null);

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

  const assignToMe = async () => {
    setActing(true);
    try {
      await apiFetch(`/moderation/reports/${reportId}/assign`, { method: "POST", body: {} });
      setData((prev) => prev
        ? { ...prev, report: { ...prev.report, status: "investigating", assignedTo: "me" } }
        : prev
      );
    } catch {
      setError("Falha ao assumir report.");
    } finally {
      setActing(false);
    }
  };

  const execute = async (action: Action) => {
    if (!data) return;
    setActing(true);
    setConfirm(null);
    try {
      if (action === "restore_content") {
        await apiFetch(`/moderation/content/${data.report.targetType}/${data.report.targetId}/restore`, {
          method: "POST",
          body: { reason: reason || "Conteúdo restaurado pelo moderador" },
        });
        setData((prev) => prev ? { ...prev, report: { ...prev.report, status: "resolved" } } : prev);
      } else {
        await apiFetch(`/moderation/reports/${reportId}/resolve`, {
          method: "POST",
          body: { action, reason: reason || `Ação: ${action}`, resolutionNote: note || undefined },
        });
        setData((prev) => prev
          ? { ...prev, report: { ...prev.report, status: action === "dismiss" ? "dismissed" : "resolved", resolutionNote: note || null } }
          : prev
        );
      }
      setReason("");
      setNote("");
    } catch {
      setError("Falha ao executar ação.");
    } finally {
      setActing(false);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const isActive = data?.report.status === "pending" || data?.report.status === "investigating";
  const availableActions = ACTIONS.filter(
    (a) => !a.only || a.only.includes(data?.report.targetType ?? "")
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <Link href="/discussions" className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Fila
        </Link>
        <PageHeader section="Discussions" title="Detalhes do Report" icon={MessageSquare} />
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : !data ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Report info + Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Report metadata */}
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
                      {REASON_LABELS[data.report.reason] ?? data.report.reason}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${PRIORITY_STYLES[data.report.priority] ?? PRIORITY_STYLES.medium}`}>
                      {data.report.priority}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[data.report.status] ?? STATUS_STYLES.pending}`}>
                      {data.report.status}
                    </span>
                    {data.report.assignedTo && (
                      <span className="flex items-center gap-1 text-xs text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10">
                        <UserCheck className="w-3 h-3" /> Atribuído
                      </span>
                    )}
                  </div>

                  {data.report.description && (
                    <p className="text-sm text-zinc-300 leading-relaxed">{data.report.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {fmt(data.report.createdAt)}
                    </div>
                    {data.report.resolvedAt && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Resolvido em {fmt(data.report.resolvedAt)}
                      </div>
                    )}
                  </div>

                  {data.report.resolutionNote && (
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                      <p className="text-xs text-zinc-500 mb-1">Nota de resolução</p>
                      <p className="text-sm text-zinc-300">{data.report.resolutionNote}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reported content preview */}
            {data.content && (
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Conteúdo Reportado</h3>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                  {Object.entries(data.content)
                    .filter(([k]) => ["content", "text", "body", "name", "title", "description", "bio"].includes(k))
                    .map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs text-zinc-600 capitalize mb-0.5">{k}</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">{String(v)}</p>
                      </div>
                    ))}
                  <p className="text-xs text-zinc-700 font-mono pt-2 border-t border-white/5">
                    ID: {data.report.targetId}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right — Reporter + Actions */}
          <div className="space-y-5">
            {/* Reporter */}
            {data.reporter && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Reportado por</h3>
                <Link href={`/community/${data.reporter.id}`} className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 overflow-hidden relative shrink-0">
                    {data.reporter.avatarUrl ? (
                      <Image src={resolveImage(data.reporter.avatarUrl) ?? ""} fill alt="" className="object-cover" sizes="36px" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-zinc-400">
                        {(data.reporter.displayName ?? data.reporter.email)?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-accent transition-colors truncate">
                      {data.reporter.displayName ?? data.reporter.username ?? "—"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{data.reporter.email}</p>
                  </div>
                </Link>
              </div>
            )}

            {/* Assign */}
            {isActive && !data.report.assignedTo && (
              <button
                onClick={assignToMe}
                disabled={acting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" /> Assumir este report
              </button>
            )}

            {/* Actions */}
            {isActive && (
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ações de Moderação</h3>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-600">Motivo (obrigatório)</label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Conteúdo viola as diretrizes..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-600">Nota interna (opcional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Observações para outros moderadores..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 resize-none"
                  />
                </div>

                {acting ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  </div>
                ) : confirm ? (
                  <div className="space-y-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <p className="text-xs text-red-400 font-medium">Confirmar: {ACTIONS.find(a => a.action === confirm)?.label}?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => execute(confirm)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirm(null)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-zinc-400 bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableActions.map((a) => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={a.action}
                          disabled={!reason && a.action !== "dismiss"}
                          onClick={() => a.confirm ? setConfirm(a.action) : execute(a.action)}
                          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${a.style}`}
                        >
                          <Icon className="w-4 h-4" /> {a.label}
                        </button>
                      );
                    })}
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
