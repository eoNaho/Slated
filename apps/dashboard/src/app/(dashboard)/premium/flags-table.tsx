"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";

interface FeatureFlag {
  id: string;
  featureKey: string;
  plan: string;
  enabled: boolean;
}

type PlanTier = "free" | "pro" | "ultra";

const PLANS: PlanTier[] = ["free", "pro", "ultra"];

const PLAN_COLORS: Record<PlanTier, string> = {
  free: "text-zinc-400 bg-zinc-800/60 border-zinc-700",
  pro: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  ultra: "text-amber-400 bg-amber-500/10 border-amber-500/30",
};

export function FlagsTable() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: FeatureFlag[] }>("/admin/feature-flags");
      setFlags(res.data);
    } catch {
      setError("Failed to load feature flags. Are you an admin?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (featureKey: string, plan: string, current: boolean) => {
    const key = `${featureKey}:${plan}`;
    setSaving(key);
    try {
      await apiFetch("/admin/feature-flags", {
        method: "PATCH",
        body: { featureKey, plan, enabled: !current },
      });
      setFlags((prev) =>
        prev.map((f) => f.featureKey === featureKey && f.plan === plan ? { ...f, enabled: !current } : f)
      );
    } catch {
      setError("Failed to update flag");
    } finally {
      setSaving(null);
    }
  };

  const grouped = flags.reduce<Record<string, Record<string, boolean>>>((acc, flag) => {
    if (!acc[flag.featureKey]) acc[flag.featureKey] = {};
    acc[flag.featureKey][flag.plan] = flag.enabled;
    return acc;
  }, {});

  const featureKeys = Object.keys(grouped).sort();

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <Shield className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Premium — Feature Flags</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage feature flags per plan tier</p>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 overflow-hidden bg-zinc-900/40">
          <div className="grid grid-cols-[1fr_repeat(3,_100px)] border-b border-white/5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            <div className="px-5 py-3">Feature</div>
            {PLANS.map((p) => (
              <div key={p} className="px-3 py-3 text-center capitalize">{p}</div>
            ))}
          </div>

          {featureKeys.length === 0 ? (
            <div className="px-5 py-12 text-center text-zinc-500 text-sm">
              No feature flags found. Run the migration to seed them.
            </div>
          ) : (
            featureKeys.map((key, i) => (
              <div key={key} className={`grid grid-cols-[1fr_repeat(3,_100px)] border-b border-white/[0.03] last:border-0 ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
                <div className="px-5 py-3.5 text-sm text-zinc-300 font-mono">{key.replace(/_/g, " ")}</div>
                {PLANS.map((plan) => {
                  const enabled = grouped[key]?.[plan] ?? false;
                  const isSaving = saving === `${key}:${plan}`;
                  return (
                    <div key={plan} className="flex items-center justify-center py-3.5">
                      <button
                        onClick={() => toggle(key, plan, enabled)}
                        disabled={isSaving}
                        className={`p-1.5 rounded-lg transition-all ${enabled ? "text-green-400 hover:bg-green-500/10" : "text-zinc-600 hover:bg-white/5"}`}
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex items-center gap-4 mt-6">
        {PLANS.map((p) => (
          <span key={p} className={`px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${PLAN_COLORS[p]}`}>{p}</span>
        ))}
        <span className="text-xs text-zinc-600 ml-auto">Changes take effect within 5 minutes (Redis cache TTL)</span>
      </div>
    </div>
  );
}
