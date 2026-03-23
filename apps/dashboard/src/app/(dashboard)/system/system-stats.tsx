"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Server, Users, Film, Star, BookOpen, AlertTriangle,
  RefreshCw, TrendingUp, Database, Cpu, Activity, HardDrive,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";

interface PlatformStats {
  user: number;
  media: number;
  reviews: number;
  lists: number;
  reports: number;
}

interface HealthData {
  api: "ok" | "error";
  db: "ok" | "error";
  redis: "ok" | "error";
  storage: {
    objectCount: number;
    totalSizeBytes: number;
    formattedSize: string;
  };
}

function StatusDot({ status }: { status: "ok" | "error" | "loading" }) {
  if (status === "loading") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
        Verificando
      </div>
    );
  }
  return status === "ok" ? (
    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Online
    </div>
  ) : (
    <div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Erro
    </div>
  );
}

export function SystemStats() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch<{ data: PlatformStats }>("/admin/stats").then((r) => r.data),
  });

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => apiFetch<{ data: HealthData }>("/admin/health").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const loading = statsLoading || healthLoading;

  const STAT_CARDS = stats
    ? [
        { label: "Usuários cadastrados", value: stats.user, icon: Users, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
        { label: "Mídias no catálogo", value: stats.media, icon: Film, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
        { label: "Reviews publicadas", value: stats.reviews, icon: Star, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
        { label: "Listas criadas", value: stats.lists, icon: BookOpen, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
        {
          label: "Reports pendentes",
          value: stats.reports,
          icon: AlertTriangle,
          color: stats.reports > 0 ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-zinc-400 bg-zinc-800/60 border-zinc-700",
          danger: stats.reports > 0,
        },
      ]
    : [];

  const SERVICES = [
    { name: "API Server", desc: "Elysia / Bun", icon: Cpu, status: health?.api ?? "loading" },
    { name: "Database", desc: "PostgreSQL / Supabase", icon: Database, status: health?.db ?? "loading" },
    { name: "Cache", desc: "Redis / Upstash", icon: Activity, status: health?.redis ?? "loading" },
  ] as const;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="System"
        title="Infraestrutura"
        icon={Server}
        actions={
          <button
            onClick={() => refetchHealth()}
            disabled={loading}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        }
      />

      {statsError && <ErrorBanner message="Falha ao carregar estatísticas." />}

      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 h-20 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : (
        <>
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Estatísticas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {STAT_CARDS.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                    <div className={`p-3 rounded-xl border ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-500 font-medium">{card.label}</p>
                      <p className="text-2xl font-bold text-white tracking-tight mt-0.5">{(card.value ?? 0).toLocaleString()}</p>
                    </div>
                    <TrendingUp className={`w-4 h-4 ${"danger" in card && card.danger ? "text-red-400" : "text-emerald-400"}`} />
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Serviços</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SERVICES.map((svc, i) => {
                const Icon = svc.icon;
                return (
                  <div key={i} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <Icon className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{svc.name}</p>
                      <p className="text-xs text-zinc-500">{svc.desc}</p>
                    </div>
                    <StatusDot status={healthLoading ? "loading" : svc.status} />
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Armazenamento</h3>
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-300 font-medium">Backblaze B2 — Media Bucket</span>
                </div>
                <span className="text-xs text-zinc-500">CDN ativo</span>
              </div>
              {healthLoading ? (
                <div className="space-y-3">
                  <div className="h-2 rounded-full bg-white/5 animate-pulse" />
                  <div className="flex justify-between">
                    <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
                    <div className="h-3 w-32 rounded bg-white/5 animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                    <p className="text-2xl font-bold text-white">{health?.storage.formattedSize ?? "—"}</p>
                    <p className="text-xs text-zinc-500 mt-1">Espaço utilizado</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                    <p className="text-2xl font-bold text-white">{health?.storage.objectCount.toLocaleString() ?? "—"}</p>
                    <p className="text-xs text-zinc-500 mt-1">Arquivos armazenados</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-zinc-600 mt-3">Imagens, avatares, capas, GIFs</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
