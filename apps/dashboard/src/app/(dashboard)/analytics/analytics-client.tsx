"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  BarChart3, Users, TrendingUp, MessageSquare, ShieldAlert,
  Film, Star, ChevronRight, RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AdminStats, UserGrowthDataPoint, ContentActivityDataPoint, ReportsAnalytics } from "@/types/admin";

const PERIOD_OPTIONS = [
  { label: "30 dias", value: "30d" },
  { label: "90 dias", value: "90d" },
  { label: "12 meses", value: "12m" },
];

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

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "dd/MM", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Assédio",
  inappropriate: "Inapropriado",
  copyright: "Copyright",
  hate_speech: "Discurso de ódio",
  misinformation: "Desinformação",
  impersonation: "Falsidade",
  self_harm: "Autolesão",
  other: "Outro",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "oklch(0.8 0.15 80)",
  investigating: "oklch(0.7 0.2 280)",
  resolved: "oklch(0.7 0.18 162)",
  dismissed: "oklch(0.5 0 0)",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  investigating: "Investigando",
  resolved: "Resolvido",
  dismissed: "Descartado",
};

const REASON_COLORS = [
  "oklch(0.7 0.2 280)",
  "oklch(0.7 0.18 162)",
  "oklch(0.769 0.188 70.08)",
  "oklch(0.6 0.15 30)",
  "oklch(0.65 0.15 220)",
  "oklch(0.75 0.15 340)",
  "oklch(0.55 0.12 180)",
  "oklch(0.8 0.1 90)",
];

export function AnalyticsClient() {
  const [period, setPeriod] = useState<"30d" | "90d" | "12m">("30d");
  const [activityDays, setActivityDays] = useState<30 | 90>(30);

  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch<{ data: AdminStats }>("/admin/stats"),
  });

  const growthQuery = useQuery({
    queryKey: ["admin-user-growth", period],
    queryFn: () => apiFetch<{ data: UserGrowthDataPoint[] }>(`/admin/stats/user-growth?period=${period}`),
  });

  const activityQuery = useQuery({
    queryKey: ["admin-content-activity", activityDays],
    queryFn: () => apiFetch<{ data: ContentActivityDataPoint[] }>(`/admin/stats/content-activity?days=${activityDays}`),
  });

  const reportsQuery = useQuery({
    queryKey: ["admin-reports-analytics"],
    queryFn: () => apiFetch<{ data: ReportsAnalytics }>("/admin/stats/reports-analytics"),
  });

  const stats = statsQuery.data?.data;
  const growthData = (growthQuery.data?.data ?? []).map((d) => ({
    ...d,
    date: formatDate(d.date),
    count: Number(d.count),
  }));
  const activityData = (activityQuery.data?.data ?? []).map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));
  const reportsAnalytics = reportsQuery.data?.data;

  const pieDataStatus = reportsAnalytics?.byStatus?.map((r) => ({
    name: STATUS_LABELS[r.status] ?? r.status,
    value: r.count,
    color: STATUS_COLORS[r.status] ?? "oklch(0.5 0 0)",
  })) ?? [];

  const pieDataReason = reportsAnalytics?.byReason?.map((r, i) => ({
    name: REASON_LABELS[r.reason] ?? r.reason,
    value: r.count,
    color: REASON_COLORS[i % REASON_COLORS.length],
  })) ?? [];

  const isLoading = statsQuery.isLoading || growthQuery.isLoading;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="Admin"
        title="Analytics"
        icon={BarChart3}
        actions={
          <button
            onClick={() => { statsQuery.refetch(); growthQuery.refetch(); activityQuery.refetch(); reportsQuery.refetch(); }}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        }
      />

      {/* Summary KPIs */}
      {stats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total usuários", value: stats.user.toLocaleString(), sub: `+${stats.newUsers.month} este mês`, icon: Users, color: "oklch(0.7 0.2 280)" },
            { label: "Reviews totais", value: stats.reviews.toLocaleString(), sub: `${stats.media.toLocaleString()} mídias`, icon: Star, color: "oklch(0.769 0.188 70.08)" },
            { label: "Listas criadas", value: stats.lists.toLocaleString(), sub: "Coleções dos usuários", icon: Film, color: "oklch(0.7 0.18 162)" },
            { label: "Reports totais", value: (stats.reportsByStatus.pending + stats.reportsByStatus.investigating + stats.reportsByStatus.resolved + stats.reportsByStatus.dismissed).toLocaleString(), sub: `${stats.reportsByStatus.resolved} resolvidos`, icon: ShieldAlert, color: "oklch(0.6 0.15 30)" },
          ].map((item, i) => (
            <div key={i} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}20`, color: item.color }}>
                  <item.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">{item.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{item.label}</p>
              <p className="text-xs text-zinc-600 mt-1">{item.sub}</p>
            </div>
          ))}
        </section>
      )}

      {/* User growth chart */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <h3 className="text-base font-semibold text-white">Crescimento de Usuários</h3>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value as typeof period)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === opt.value
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                style={period === opt.value ? { background: "var(--accent)", opacity: 0.9 } : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {growthQuery.isLoading ? (
          <div className="h-56 animate-pulse rounded-xl bg-white/[0.02]" />
        ) : growthData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="analyticsGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.7 0.2 280)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.7 0.2 280)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
              <XAxis dataKey="date" tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="count" name="Novos usuários" stroke="oklch(0.7 0.2 280)" strokeWidth={2} fill="url(#analyticsGrowthGrad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-56 flex items-center justify-center text-sm text-zinc-600">Nenhum dado disponível para este período</div>
        )}
      </div>

      {/* Content activity + Reports pie */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-accent" />
              <h3 className="text-base font-semibold text-white">Atividade de Conteúdo</h3>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
              {([30, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setActivityDays(d)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activityDays === d ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  style={activityDays === d ? { background: "var(--accent)", opacity: 0.9 } : undefined}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          {activityQuery.isLoading ? (
            <div className="h-52 animate-pulse rounded-xl bg-white/[0.02]" />
          ) : activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={activityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.5 0 0)" }} />
                <Line type="monotone" dataKey="reviews" name="Reviews" stroke="oklch(0.7 0.2 280)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                <Line type="monotone" dataKey="comments" name="Comentários" stroke="oklch(0.7 0.18 162)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                <Line type="monotone" dataKey="lists" name="Listas" stroke="oklch(0.769 0.188 70.08)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                <Line type="monotone" dataKey="diary" name="Diário" stroke="oklch(0.65 0.15 220)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-sm text-zinc-600">Nenhum dado disponível</div>
          )}
        </div>

        <div className="lg:col-span-4 glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <ShieldAlert className="w-4 h-4 text-accent" />
            <h3 className="text-base font-semibold text-white">Reports por Status</h3>
          </div>
          {reportsQuery.isLoading ? (
            <div className="h-52 animate-pulse rounded-xl bg-white/[0.02]" />
          ) : pieDataStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieDataStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                    {pieDataStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieDataStatus.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                      <span className="text-zinc-400">{entry.name}</span>
                    </div>
                    <span className="font-semibold text-white">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-52 flex items-center justify-center text-sm text-zinc-600">Sem dados</div>
          )}
        </div>
      </section>

      {/* Reports by reason */}
      {pieDataReason.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <ShieldAlert className="w-4 h-4 text-accent" />
            <h3 className="text-base font-semibold text-white">Distribuição de Reports por Motivo</h3>
            {reportsAnalytics?.avgResolutionHours !== undefined && reportsAnalytics.avgResolutionHours > 0 && (
              <span className="ml-auto text-xs text-zinc-500">
                Tempo médio de resolução: <span className="text-white font-semibold">{reportsAnalytics.avgResolutionHours}h</span>
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pieDataReason} layout="vertical" margin={{ top: 0, right: 20, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="value" name="Reports" radius={[0, 4, 4, 0]}>
                {pieDataReason.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* New users breakdown */}
      {stats && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-4 h-4 text-accent" />
            <h3 className="text-base font-semibold text-white">Novos Usuários — Resumo</h3>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={[
                { label: "Hoje", value: stats.newUsers.today },
                { label: "7 dias", value: stats.newUsers.week },
                { label: "30 dias", value: stats.newUsers.month },
              ]}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
              <XAxis dataKey="label" tick={{ fill: "oklch(0.5 0 0)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="value" name="Novos usuários" fill="oklch(0.7 0.2 280)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
