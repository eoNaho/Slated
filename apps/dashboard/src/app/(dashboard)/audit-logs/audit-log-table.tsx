"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { resolveImage } from "@/lib/utils";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PageHeader } from "@/components/ui/page-header";
import {
  Activity, Loader2, RefreshCw, Search,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import Image from "next/image";

interface AuditLog {
  log: {
    id: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    ipAddress: string | null;
    metadata: string | null;
    createdAt: string;
  };
  actor: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}

const ACTION_LABELS: Record<string, string> = {
  admin_user_status_change: "Mudou status de usuário",
  admin_user_role_change: "Mudou role de usuário",
  admin_content_delete: "Deletou conteúdo",
  admin_report_resolve: "Resolveu report",
  admin_feature_flag_update: "Atualizou feature flag",
  login: "Login realizado",
  login_failed: "Falha no login",
  logout: "Logout",
  register: "Novo cadastro",
  password_change: "Alteração de senha",
  "2fa_enabled": "2FA ativado",
  "2fa_disabled": "2FA desativado",
};

const ACTION_COLORS: Record<string, string> = {
  admin_content_delete: "text-red-400 bg-red-500/10 border-red-500/20",
  admin_user_status_change: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  admin_user_role_change: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  admin_feature_flag_update: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  admin_report_resolve: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const ACTION_OPTIONS = [
  "admin_user_status_change",
  "admin_user_role_change",
  "admin_content_delete",
  "admin_report_resolve",
  "admin_feature_flag_update",
  "login",
  "login_failed",
  "register",
];

export function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 30;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (actionFilter) params.set("action", actionFilter);
      const res = await apiFetch<{ data: AuditLog[]; total: number }>(`/admin/audit-logs?${params}`);
      setLogs(res.data);
      setTotal(res.total);
    } catch {
      setError("Falha ao carregar audit logs.");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="System"
        title="Audit Logs"
        icon={Activity}
        badge={total}
        actions={
          <button onClick={load} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="pl-8 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-300 focus:outline-none focus:border-accent/40 transition-colors appearance-none cursor-pointer"
          >
            <option value="">Todas as ações</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="rounded-2xl border border-white/5 overflow-hidden bg-zinc-900/40">
        <div className="grid grid-cols-[200px_1fr_140px_140px] text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-white/5">
          <div className="px-5 py-3">Admin</div>
          <div className="px-4 py-3">Ação</div>
          <div className="px-4 py-3">Entidade</div>
          <div className="px-4 py-3">Quando</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-sm">
            <Activity className="w-8 h-8 mb-3 opacity-30" />
            Nenhum log encontrado.
          </div>
        ) : (
          logs.map(({ log, actor }, i) => (
            <div
              key={log.id}
              className={`grid grid-cols-[200px_1fr_140px_140px] border-b border-white/[0.03] last:border-0 ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}
            >
              <div className="flex items-center gap-2.5 px-5 py-3.5">
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 overflow-hidden relative shrink-0">
                  {actor?.avatarUrl ? (
                    <Image src={resolveImage(actor.avatarUrl) ?? ""} fill alt="" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-zinc-400">
                        {(actor?.displayName || actor?.username || "S")?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-zinc-300 truncate">
                  {actor?.displayName || actor?.username || "Sistema"}
                </span>
              </div>
              <div className="flex items-center px-4 py-3.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ACTION_COLORS[log.action] ?? "text-zinc-400 bg-zinc-800/60 border-zinc-700"}`}>
                  {ACTION_LABELS[log.action] || log.action}
                </span>
              </div>
              <div className="flex items-center px-4 py-3.5">
                {log.entityType ? (
                  <span className="text-xs text-zinc-400 capitalize">
                    {log.entityType}
                    {log.entityId && <span className="text-zinc-600 ml-1 font-mono">{log.entityId.slice(0, 6)}…</span>}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600">—</span>
                )}
              </div>
              <div className="flex items-center px-4 py-3.5">
                <span className="text-xs text-zinc-500">{formatDate(log.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-medium">
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
