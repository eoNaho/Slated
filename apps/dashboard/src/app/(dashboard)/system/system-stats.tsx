"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Server, Users, Film, Star, BookOpen, AlertTriangle,
  Loader2, RefreshCw, TrendingUp, Database, Cpu, Activity,
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

export function SystemStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: PlatformStats }>("/admin/stats");
      setStats(res.data);
      setLastUpdated(new Date());
    } catch {
      setError("Falha ao carregar estatísticas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const STAT_CARDS = stats ? [
    { label: "Usuários cadastrados", value: stats.user, icon: Users, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { label: "Mídias no catálogo", value: stats.media, icon: Film, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    { label: "Reviews publicadas", value: stats.reviews, icon: Star, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { label: "Listas criadas", value: stats.lists, icon: BookOpen, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    {
      label: "Reports pendentes", value: stats.reports, icon: AlertTriangle,
      color: stats.reports > 0 ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-zinc-400 bg-zinc-800/60 border-zinc-700",
      danger: stats.reports > 0,
    },
  ] : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="System"
        title="Infraestrutura"
        icon={Server}
        actions={
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-zinc-600">
                Atualizado às {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button onClick={load} disabled={loading} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors disabled:opacity-40">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
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
                      <p className="text-2xl font-bold text-white tracking-tight mt-0.5">{card.value.toLocaleString()}</p>
                    </div>
                    <TrendingUp className={`w-4 h-4 ${card.danger ? "text-red-400" : "text-emerald-400"}`} />
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Serviços</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: "API Server", desc: "Elysia / Bun", icon: Cpu },
                { name: "Database", desc: "PostgreSQL / Supabase", icon: Database },
                { name: "Cache", desc: "Redis / Upstash", icon: Activity },
              ].map((svc, i) => {
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
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Online
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Armazenamento</h3>
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-zinc-300 font-medium">Backblaze B2 — Media Bucket</span>
                <span className="text-xs text-zinc-500">CDN ativo</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-accent/60 w-[34%]" />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-zinc-600">
                <span>34% utilizado</span>
                <span>Imagens, avatares, capas, GIFs</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
