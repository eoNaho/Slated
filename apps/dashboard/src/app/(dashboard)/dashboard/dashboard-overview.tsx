"use client";

import {
  Users, Film, MessageSquare, Zap, TrendingUp, Clock,
  Activity, ChevronRight, Database, Cpu, ArrowUpRight,
} from "lucide-react";

export function DashboardOverview() {
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
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            API Online
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Community", value: "—", delta: "+12%", icon: Users, color: "oklch(0.7 0.2 280)" },
          { label: "Active Sessions", value: "—", delta: "+4%", icon: Zap, color: "oklch(0.696 0.17 162.48)" },
          { label: "Discussion Load", value: "—", delta: "+18%", icon: MessageSquare, color: "oklch(0.6 0.118 184.704)" },
          { label: "Media Indexed", value: "—", delta: "+2%", icon: Film, color: "oklch(0.769 0.188 70.08)" },
        ].map((stat, i) => (
          <div key={i} className="glass-card group relative p-5 rounded-2xl overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
              <stat.icon className="w-12 h-12" style={{ color: stat.color }} />
            </div>
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">{stat.label}</span>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <TrendingUp className="w-3 h-3" /> {stat.delta}
                </span>
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">{stat.value}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card rounded-2xl p-6 lg:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none text-accent">
              <Activity className="w-48 h-48" />
            </div>
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h3 className="text-lg font-semibold text-white tracking-tight">Engagement Flux</h3>
                <p className="text-sm text-zinc-500 mt-1 max-w-sm">Regional activity over the last 24h.</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-zinc-400">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Live
              </div>
            </div>
            <div className="h-[240px] w-full flex items-end gap-[1px] relative">
              {Array.from({ length: 100 }).map((_, i) => {
                const height = (Math.sin(i * 0.2) * 20 + 40 + (i % 7) * 2).toFixed(2);
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm ${i > 85 ? "bg-accent/20" : "bg-white/5"}`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-white/5 relative z-10">
              {[
                { l: "Ingress", v: "14.2 GB/s", i: ArrowUpRight },
                { l: "Server Load", v: "24%", i: Cpu },
                { l: "Queries", v: "8.4K/s", i: Database },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <item.i className="w-3.5 h-3.5 text-accent" /> {item.l}
                  </div>
                  <div className="text-xl font-bold text-white tracking-tight">{item.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-white">Live Events</h3>
              <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">Live</span>
            </div>
            <div className="space-y-5">
              {[
                { u: "System", a: "started cron job", t: "stories-expiry", time: "just now" },
                { u: "System", a: "ran daily rewind", t: "diary → stories", time: "23:00 UTC" },
                { u: "Admin", a: "updated flags", t: "feature-gate cache", time: "5m ago" },
              ].map((event, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="shrink-0 p-2 rounded-lg bg-white/5 border border-white/10 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 leading-snug">
                      <span className="font-semibold text-white">{event.u}</span> {event.a}{" "}
                      <span className="text-accent">{event.t}</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
