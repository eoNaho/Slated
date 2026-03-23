"use client";

import {
  Users, Film, MessageSquare, Zap, Clock,
  Activity, ChevronRight, ArrowUpRight, RefreshCw,
  ShieldAlert, TrendingUp, BookOpen, ListTodo, Database,
  Server, Wifi,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ErrorBanner } from "@/components/ui/error-banner";
import { StatCard } from "@/components/ui/stat-card";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AdminStats, UserGrowthDataPoint, ContentActivityDataPoint, ReportsAnalytics, AuditLog, SystemHealth } from "@/types/admin";

const ACTION_LABELS: Record<string, string> = {
  admin_user_status_change: "mudou status de usuário",
  admin_user_role_change: "mudou role de usuário",
  admin_content_delete: "deletou conteúdo",
  admin_report_resolve: "resolveu report",
  admin_feature_flag_update: "atualizou feature flag",
  admin_blocklist_add: "adicionou ao blocklist",
  admin_blocklist_delete: "removeu do blocklist",
  login: "fez login",
  register: "registrou conta",
  logout: "saiu",
};

const REPORT_COLORS: Record<string, string> = {
  pending: "oklch(0.8 0.15 80)",
  investigating: "oklch(0.7 0.2 280)",
  resolved: "oklch(0.7 0.18 162)",
  dismissed: "oklch(0.5 0 0)",
};

const REPORT_LABELS: Record<string, string> = {
  pending: "Pendente",
  investigating: "Investigando",
  resolved: "Resolvido",
  dismissed: "Descartado",
};

// Custom tooltip for recharts matching the dark theme
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-300">{p.name ?? p.dataKey}:</span>
          <span className="font-semibold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function formatDateShort(dateStr: string) {
  try {
    return format(new Date(dateStr), "dd/MM", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function DashboardOverview() {
  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch<{ data: AdminStats }>("/admin/stats"),
    refetchInterval: 60_000,
  });

  const growthQuery = useQuery({
    queryKey: ["admin-user-growth", "30d"],
    queryFn: () => apiFetch<{ data: UserGrowthDataPoint[] }>("/admin/stats/user-growth?period=30d"),
  });

  const activityQuery = useQuery({
    queryKey: ["admin-content-activity"],
    queryFn: () => apiFetch<{ data: ContentActivityDataPoint[] }>("/admin/stats/content-activity?days=30"),
  });

  const reportsAnalyticsQuery = useQuery({
    queryKey: ["admin-reports-analytics"],
    queryFn: () => apiFetch<{ data: ReportsAnalytics }>("/admin/stats/reports-analytics"),
  });

  const auditQuery = useQuery({
    queryKey: ["admin-audit-logs-recent"],
    queryFn: () => apiFetch<{ data: AuditLog[] }>("/admin/audit-logs?limit=6"),
    refetchInterval: 30_000,
  });

  const healthQuery = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => apiFetch<{ data: SystemHealth }>("/admin/health"),
    refetchInterval: 30_000,
  });

  const stats = statsQuery.data?.data;
  const growthData = (growthQuery.data?.data ?? []).map((d) => ({
    ...d,
    date: formatDateShort(d.date),
    count: Number(d.count),
  }));
  const activityData = (activityQuery.data?.data ?? []).map((d) => ({
    ...d,
    date: formatDateShort(d.date),
  }));
  const reportsAnalytics = reportsAnalyticsQuery.data?.data;
  const auditLogs = auditQuery.data?.data ?? [];
  const health = healthQuery.data?.data;

  const loading = statsQuery.isLoading;
  const error = statsQuery.error?.message ?? null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const pieData = reportsAnalytics?.byStatus?.map((r) => ({
    name: REPORT_LABELS[r.status] ?? r.status,
    value: r.count,
    color: REPORT_COLORS[r.status] ?? "oklch(0.5 0 0)",
  })) ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
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
          <button
            onClick={() => {
              statsQuery.refetch();
              growthQuery.refetch();
              activityQuery.refetch();
              auditQuery.refetch();
              healthQuery.refetch();
            }}
            disabled={loading}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors disabled:opacity-30"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {/* Service health pills */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { label: "API", status: health?.api ?? "ok", icon: Server },
              { label: "DB", status: health?.db, icon: Database },
              { label: "Redis", status: health?.redis, icon: Wifi },
            ].map(({ label, status, icon: Icon }) => (
              <div
                key={label}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
                  status === "ok"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : status === "error"
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-white/5 border-white/10 text-zinc-500"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${status === "ok" ? "bg-emerald-500 animate-pulse" : status === "error" ? "bg-red-500" : "bg-zinc-500"}`} />
                <Icon className="w-3 h-3" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </header>

      {error && <ErrorBanner message="Falha ao carregar dados do dashboard." onDismiss={() => statsQuery.refetch()} />}

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 h-32 animate-pulse bg-white/[0.02]" />
          ))
        ) : stats ? (
          <>
            <div className="glass-card group relative p-5 rounded-2xl overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
                <Users className="w-12 h-12" style={{ color: "oklch(0.7 0.2 280)" }} />
              </div>
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Total Comunidade</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{stats.user.toLocaleString()}</div>
                <p className="text-xs text-zinc-500">+{stats.newUsers.today} hoje · +{stats.newUsers.week} esta semana</p>
              </div>
            </div>
            <div className="glass-card group relative p-5 rounded-2xl overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
                <Zap className="w-12 h-12" style={{ color: "oklch(0.696 0.17 162.48)" }} />
              </div>
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Usuários Ativos (7d)</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{stats.activeUsers.last7d.toLocaleString()}</div>
                <p className="text-xs text-zinc-500">{stats.activeUsers.last24h} nas últimas 24h</p>
              </div>
            </div>
            <div className="glass-card group relative p-5 rounded-2xl overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
                <MessageSquare className="w-12 h-12" style={{ color: stats.reportsByStatus.pending > 0 ? "oklch(0.6 0.15 30)" : "oklch(0.6 0.118 184.704)" }} />
              </div>
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Reports Pendentes</span>
                  {stats.reportsByStatus.pending > 0 ? (
                    <span className="text-xs font-semibold text-amber-400">{stats.reportsByStatus.investigating} investigando</span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-400">Tudo limpo</span>
                  )}
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{stats.reportsByStatus.pending.toLocaleString()}</div>
                <p className="text-xs text-zinc-500">{stats.reportsByStatus.resolved} resolvidos · {stats.reportsByStatus.dismissed} descartados</p>
              </div>
            </div>
            <div className="glass-card group relative p-5 rounded-2xl overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
                <Film className="w-12 h-12" style={{ color: "oklch(0.769 0.188 70.08)" }} />
              </div>
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Mídia Indexada</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{stats.media.toLocaleString()}</div>
                <p className="text-xs text-zinc-500">{stats.reviews.toLocaleString()} reviews · {stats.lists.toLocaleString()} listas</p>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User growth area chart */}
        <div className="lg:col-span-8 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h3 className="text-base font-semibold text-white">Crescimento de Usuários (30 dias)</h3>
            </div>
            <Link href="/community" className="text-xs font-medium text-accent hover:text-accent/80 transition-colors">
              Ver comunidade
            </Link>
          </div>
          {growthQuery.isLoading ? (
            <div className="h-48 animate-pulse rounded-xl bg-white/[0.02]" />
          ) : growthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.7 0.2 280)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.7 0.2 280)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Novos usuários"
                  stroke="oklch(0.7 0.2 280)"
                  strokeWidth={2}
                  fill="url(#growthGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "oklch(0.7 0.2 280)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-zinc-600">Nenhum dado disponível</div>
          )}
        </div>

        {/* Reports pie chart */}
        <div className="lg:col-span-4 glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <ShieldAlert className="w-4 h-4 text-accent" />
            <h3 className="text-base font-semibold text-white">Reports por Status</h3>
          </div>
          {reportsAnalyticsQuery.isLoading ? (
            <div className="h-48 animate-pulse rounded-xl bg-white/[0.02]" />
          ) : pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                      <span className="text-zinc-400">{entry.name}</span>
                    </div>
                    <span className="font-semibold text-white">{entry.value}</span>
                  </div>
                ))}
                {reportsAnalytics && reportsAnalytics.avgResolutionHours > 0 && (
                  <p className="text-xs text-zinc-600 pt-2 border-t border-white/5">
                    Tempo médio de resolução: {reportsAnalytics.avgResolutionHours}h
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-zinc-600">Sem reports</div>
          )}
        </div>
      </section>

      {/* Content activity + Audit logs */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Content activity bar chart */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" />
              <h3 className="text-base font-semibold text-white">Atividade de Conteúdo (30 dias)</h3>
            </div>
          </div>
          {activityQuery.isLoading ? (
            <div className="h-44 animate-pulse rounded-xl bg-white/[0.02]" />
          ) : activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={activityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={4} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.5 0 0)" }} />
                <Bar dataKey="reviews" name="Reviews" fill="oklch(0.7 0.2 280)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="comments" name="Comentários" fill="oklch(0.7 0.18 162)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="lists" name="Listas" fill="oklch(0.769 0.188 70.08)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-sm text-zinc-600">Nenhum dado disponível</div>
          )}
        </div>

        {/* Recent audit logs */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              <h3 className="text-base font-semibold text-white">Ações Recentes</h3>
            </div>
            <Link href="/audit-logs" className="text-xs font-medium text-accent hover:text-accent/80 transition-colors">
              Ver tudo
            </Link>
          </div>

          {auditQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.02]" />
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">Nenhuma ação registrada.</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((item: any) => {
                const log = item.log ?? item;
                const actor = item.actor;
                return (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="shrink-0 p-1.5 rounded-lg bg-white/5 border border-white/10 mt-0.5">
                      <ShieldAlert className="w-3 h-3 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 leading-snug truncate">
                        <span className="font-semibold text-white">
                          {actor?.displayName || actor?.name || actor?.username || "Sistema"}
                        </span>{" "}
                        {ACTION_LABELS[log.action] || log.action}
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {stats && stats.reportsByStatus.pending > 0 && (
            <Link
              href="/discussions"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {stats.reportsByStatus.pending} {stats.reportsByStatus.pending === 1 ? "report pendente" : "reports pendentes"}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
