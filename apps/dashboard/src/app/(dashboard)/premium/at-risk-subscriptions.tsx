"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AtRiskSubscription {
  subscriptionId: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  stripeCustomerId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
}

interface AtRiskResponse {
  data: AtRiskSubscription[];
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return d;
  }
}

export function AtRiskSubscriptions() {
  const query = useQuery({
    queryKey: ["admin-subscriptions-at-risk"],
    queryFn: () => apiFetch<AtRiskResponse>("/admin/subscriptions/at-risk"),
    refetchInterval: 60_000,
  });

  const list = query.data?.data ?? [];

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Assinaturas em Risco</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Status <span className="font-mono text-red-400">past_due</span> — pagamento falhou</p>
          </div>
        </div>
        <button
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors disabled:opacity-30"
        >
          <RefreshCw className={`w-4 h-4 ${query.isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.02] border border-white/5" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-white/5 bg-zinc-900/30">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
            <AlertTriangle className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-zinc-300">Nenhuma assinatura em risco</p>
          <p className="text-xs text-zinc-500 mt-1">Todos os pagamentos estão em dia.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-red-500/10 overflow-hidden bg-zinc-900/40">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-5 py-3 border-b border-white/5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            <span>Usuário</span>
            <span className="text-right">Período expira</span>
            <span className="text-right">Stripe</span>
          </div>
          {list.map((sub, i) => (
            <div
              key={sub.subscriptionId}
              className={`grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-5 py-3.5 border-b border-white/[0.03] last:border-0 ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{sub.userName || "—"}</p>
                <p className="text-xs text-zinc-500 truncate">{sub.userEmail}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400 font-mono whitespace-nowrap">{formatDate(sub.currentPeriodEnd)}</p>
                {sub.cancelAtPeriodEnd && (
                  <span className="text-[10px] font-semibold text-amber-400">cancelamento agendado</span>
                )}
              </div>
              <div className="text-right">
                {sub.stripeCustomerId ? (
                  <a
                    href={`https://dashboard.stripe.com/customers/${sub.stripeCustomerId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Stripe
                  </a>
                ) : (
                  <span className="text-xs text-zinc-700">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
