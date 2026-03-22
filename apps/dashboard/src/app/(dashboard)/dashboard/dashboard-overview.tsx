"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Film, MessageSquare, Zap, TrendingUp, Clock,
  Activity, ChevronRight, ArrowUpRight, Loader2, RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ErrorBanner } from "@/components/ui/error-banner";
import Link from "next/link";

interface Stats {
  user: number;
  media: number;
  reviews: number;
  lists: number;
  reports: number;
  reportsByStatus: { pending: number; investigating: number; resolved: number; dismissed: number };
  newUsers: { today: number; week: number; month: number };
  activeUsers: { last24h: number; last7d: number };
}

interface AuditLog {
  log: { id: string; action: string; entityType: string | null; entityId: string | null; createdAt: string };
  actor: { displayName: string | null; username: string | null } | null;
}

const ACTION_LABELS: Record<string, string> = {
  admin_user_status_change: "mudou status de usuário",
  admin_user_role_change: "mudou role de usuário",
  admin_content_delete: "deletou conteúdo",
  admin_report_resolve: "resolveu report",
  admin_feature_flag_update: "atualizou feature flag",
  login: "fez login",
  register: "registrou conta",
};

export function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, logsRes] = await Promise.all([
        apiFetch<{ data: Stats }>("/admin/stats"),
        apiFetch<{ data: AuditLog[] }>("/admin/audit-logs?limit=6"),
      ]);
      setStats(statsRes.data);
      setAuditLogs(logsRes.data);
    } catch {
      setError("Falha ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-2">
            <span>Control</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-zinc-300">Overview</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Platform Pulse</h2>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <button
              onClick={load}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            API Online
          </div>
        </div>
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : stats ? (
        <>
          {/* Stat cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Community", value: stats.user.toLocaleString(), sub: `+${stats.newUsers.today} hoje`, icon: Users, color: "oklch(0.7 0.2 280)" },
              { label: "Active Users (7d)", value: stats.activeUsers.last7d.toLocaleString(), sub: `${stats.activeUsers.last24h} nas últimas 24h`, icon: Zap, color: "oklch(0.696 0.17 162.48)" },
              { label: "Pending Reports", value: stats.reportsByStatus.pending.toLocaleString(), sub: stats.reportsByStatus.investigating > 0 ? `${stats.reportsByStatus.investigating} investigando` : "Tudo limpo", icon: MessageSquare, color: stats.reportsByStatus.pending > 0 ? "oklch(0.6 0.15 30)" : "oklch(0.6 0.118 184.704)" },
              { label: "Media Indexed", value: stats.media.toLocaleString(), sub: `${stats.reviews.toLocaleString()} reviews`, icon: Film, color: "oklch(0.769 0.188 70.08)" },
            ].map((stat, i) => (
              <div key={i} className="glass-card group relative p-5 rounded-2xl overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
                  <stat.icon className="w-12 h-12" style={{ color: stat.color }} />
                </div>
                <div className="relative z-10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">{stat.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-bold text-white tracking-tight">{stat.value}</div>
                  <p className="text-xs text-zinc-500">{stat.sub}</p>
                </div>
              </div>
            ))}
          </section>

          {/* Growth + Audit logs */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Growth card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-5">Crescimento de Usuários</h3>
                <div className="space-y-4">
                  {[
                    { label: "Hoje", value: stats.newUsers.today, max: Math.max(stats.newUsers.month, 1) },
                    { label: "Esta semana", value: stats.newUsers.week, max: Math.max(stats.newUsers.month, 1) },
                    { label: "Este mês", value: stats.newUsers.month, max: Math.max(stats.newUsers.month, 1) },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-zinc-400">{item.label}</span>
                        <span className="text-xs font-semibold text-white">+{item.value}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent/70"
                          style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Reports resolvidos</p>
                    <p className="text-xl font-bold text-white">{stats.reportsByStatus.resolved.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Listas criadas</p>
                    <p className="text-xl font-bold text-white">{stats.lists.toLocaleString()}</p>
                  </div>
                </div>

                <Link
                  href="/community"
                  className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition-colors"
                >
                  <Users className="w-3.5 h-3.5" /> Ver todos os usuários
                </Link>
              </div>
            </div>

            {/* Recent audit logs */}
            <div className="lg:col-span-7">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-accent" />
                    <h3 className="text-base font-semibold text-white">Ações Recentes</h3>
                  </div>
                  <Link href="/audit-logs" className="text-xs font-medium text-accent hover:text-accent/80 transition-colors">
                    Ver tudo
                  </Link>
                </div>

                {auditLogs.length === 0 ? (
                  <p className="text-sm text-zinc-500 py-4">Nenhuma ação registrada.</p>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map(({ log, actor }) => (
                      <div key={log.id} className="flex items-start gap-3">
                        <div className="shrink-0 p-2 rounded-lg bg-white/5 border border-white/10 mt-0.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-300 leading-snug">
                            <span className="font-semibold text-white">
                              {actor?.displayName || actor?.username || "Sistema"}
                            </span>{" "}
                            {ACTION_LABELS[log.action] || log.action}
                            {log.entityType && (
                              <span className="text-accent"> ({log.entityType})</span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {stats.reportsByStatus.pending > 0 && (
                  <Link
                    href="/discussions"
                    className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {stats.reportsByStatus.pending} {stats.reportsByStatus.pending === 1 ? "report pendente" : "reports pendentes"}
                  </Link>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
