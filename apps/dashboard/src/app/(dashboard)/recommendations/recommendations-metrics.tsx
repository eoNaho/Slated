"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, ThumbsUp, ThumbsDown, Users, Database, TrendingUp, RefreshCw } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Legend,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";

interface RecMetrics {
  feedback: {
    distribution: { type: string; count: number }[];
    total: number;
    conversionRate: number;
  };
  onboarding: {
    completed: number;
    total: number;
    completionRate: number;
  };
  cache: {
    tasteProfiles: number;
    similarityPairs: number;
  };
  topRecommendedMedia: { mediaId: string; impressions: number }[];
}

const FEEDBACK_COLORS: Record<string, string> = {
  loved_it: "#10b981",
  not_interested: "#ef4444",
  already_seen: "#f59e0b",
  not_my_taste: "#a855f7",
};

const FEEDBACK_LABELS: Record<string, string> = {
  loved_it: "Loved it",
  not_interested: "Not interested",
  already_seen: "Already seen",
  not_my_taste: "Not my taste",
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
        <Icon className="h-4 w-4 opacity-60" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export function RecommendationsMetrics() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-rec-metrics"],
    queryFn: () =>
      apiFetch<{ data: RecMetrics }>("/admin/recommendations/metrics").then((r) => r.data),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="Recommendations"
        title="Recommendation System Metrics"
        icon={Sparkles}
        actions={
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        }
      />

      {error && <ErrorBanner message="Failed to load recommendation metrics." />}

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-zinc-900 animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total feedback"
              value={data.feedback.total.toLocaleString()}
              icon={ThumbsUp}
              color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            />
            <StatCard
              label="Conversion rate"
              value={`${(data.feedback.conversionRate * 100).toFixed(1)}%`}
              icon={TrendingUp}
              color="text-blue-400 bg-blue-500/10 border-blue-500/20"
            />
            <StatCard
              label="Onboarding completed"
              value={`${(data.onboarding.completionRate * 100).toFixed(0)}% (${data.onboarding.completed})`}
              icon={Users}
              color="text-purple-400 bg-purple-500/10 border-purple-500/20"
            />
            <StatCard
              label="Cached profiles"
              value={data.cache.tasteProfiles.toLocaleString()}
              icon={Database}
              color="text-amber-400 bg-amber-500/10 border-amber-500/20"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feedback distribution pie */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">Feedback Distribution</h3>
              {data.feedback.distribution.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.feedback.distribution}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={(props) => {
                          const p = props as unknown as { type: string; percent?: number };
                          return `${FEEDBACK_LABELS[p.type] ?? p.type} ${((p.percent ?? 0) * 100).toFixed(0)}%`;
                        }}
                        labelLine={false}
                      >
                        {data.feedback.distribution.map((entry) => (
                          <Cell
                            key={entry.type}
                            fill={FEEDBACK_COLORS[entry.type] ?? "#71717a"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                        formatter={(value, name) => [value, FEEDBACK_LABELS[String(name)] ?? String(name)]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm py-8 text-center">No feedback data yet</p>
              )}
            </div>

            {/* Cache stats */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">Cache Status</h3>
              <div className="space-y-4">
                <CacheRow
                  label="Cached taste profiles"
                  value={data.cache.tasteProfiles}
                  description="Computed taste profiles"
                />
                <CacheRow
                  label="Similarity pairs"
                  value={data.cache.similarityPairs}
                  description="Pre-computed similar users"
                />
                <CacheRow
                  label="Completed onboardings"
                  value={data.onboarding.completed}
                  description={`${data.onboarding.total} total`}
                />
              </div>
            </div>
          </div>

          {/* Top recommended media */}
          {data.topRecommendedMedia.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">Top Recommended Media</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topRecommendedMedia.slice(0, 8)}
                    margin={{ top: 0, right: 10, bottom: 0, left: -20 }}
                  >
                    <XAxis
                      dataKey="mediaId"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      tickFormatter={(id: string) => id.slice(0, 8) + "…"}
                    />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                      labelStyle={{ color: "#e4e4e7", fontSize: 11 }}
                    />
                    <Bar dataKey="impressions" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CacheRow({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0">
      <div>
        <p className="text-sm text-zinc-300">{label}</p>
        <p className="text-xs text-zinc-600">{description}</p>
      </div>
      <span className="text-lg font-bold text-zinc-200 tabular-nums">
        {value.toLocaleString()}
      </span>
    </div>
  );
}
