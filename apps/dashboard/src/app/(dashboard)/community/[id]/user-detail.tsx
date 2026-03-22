"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { resolveImage } from "@/lib/utils";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PageHeader } from "@/components/ui/page-header";
import {
  Users, Loader2, ArrowLeft, Clock, Monitor, Shield, Ban,
  CheckCircle, ShieldAlert, ShieldCheck, History,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface UserDetail {
  id: string;
  displayName: string | null;
  username: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastActiveAt: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isPremium: boolean | null;
  stats: { reviews: number; lists: number; reportsFiled: number };
}

interface LoginEntry {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  success: boolean | null;
  createdAt: string;
}

interface ModerationAction {
  id: string;
  action: string;
  reason: string | null;
  automated: boolean;
  createdAt: string;
}

interface ModerationHistory {
  actions: ModerationAction[];
  reportCount: number;
}

const STATUS_STYLES: Record<string, string> = {
  active:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  suspended: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  banned:    "text-red-400 bg-red-500/10 border-red-500/20",
};

const ROLE_STYLES: Record<string, string> = {
  admin:     "text-purple-400 bg-purple-500/10 border-purple-500/20",
  moderator: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  user:      "text-zinc-400 bg-zinc-800/60 border-zinc-700",
};

const ACTION_STYLES: Record<string, string> = {
  warn:    "text-amber-400",
  hide:    "text-blue-400",
  restore: "text-teal-400",
  delete:  "text-red-400",
  suspend: "text-orange-400",
  ban:     "text-red-500",
  unban:   "text-emerald-400",
};

type Tab = "login" | "moderation";

export function UserDetail({ userId }: { userId: string }) {
  const [userDetail, setUser] = useState<UserDetail | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
  const [modHistory, setModHistory] = useState<ModerationHistory | null>(null);
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, historyRes, modRes] = await Promise.all([
        apiFetch<{ data: UserDetail }>(`/admin/users/${userId}`),
        apiFetch<{ data: LoginEntry[] }>(`/admin/users/${userId}/login-history`).catch(() => ({ data: [] })),
        apiFetch<{ data: ModerationHistory }>(`/moderation/users/${userId}/history`).catch(() => ({ data: { actions: [], reportCount: 0 } })),
      ]);
      setUser(userRes.data);
      setLoginHistory(historyRes.data);
      setModHistory(modRes.data);
    } catch {
      setError("Falha ao carregar usuário.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (status: "active" | "suspended" | "banned") => {
    if (!userDetail) return;
    setUpdating(true);
    try {
      await apiFetch(`/admin/user/${userId}/status`, { method: "PATCH", body: { status } });
      setUser((prev) => prev ? { ...prev, status } : prev);
    } catch {
      setError("Falha ao atualizar status.");
    } finally {
      setUpdating(false);
    }
  };

  const updateRole = async (role: "user" | "moderator" | "admin") => {
    if (!userDetail) return;
    setUpdating(true);
    try {
      await apiFetch(`/admin/users/${userId}/role`, { method: "PATCH", body: { role } });
      setUser((prev) => prev ? { ...prev, role } : prev);
    } catch {
      setError("Falha ao atualizar role.");
    } finally {
      setUpdating(false);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <Link href="/community" className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Usuários
        </Link>
        <PageHeader section="Community" title="Detalhe do Usuário" icon={Users} />
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : !userDetail ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-zinc-800 border border-white/10 overflow-hidden relative shrink-0">
                  {userDetail.avatarUrl ? (
                    <Image src={resolveImage(userDetail.avatarUrl) ?? ""} fill alt="" className="object-cover" sizes="56px" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-zinc-400">
                      {(userDetail.displayName ?? userDetail.email)?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-white truncate">{userDetail.displayName ?? "—"}</p>
                  {userDetail.username && <p className="text-sm text-zinc-500">@{userDetail.username}</p>}
                  <p className="text-xs text-zinc-600 truncate">{userDetail.email}</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ROLE_STYLES[userDetail.role] ?? ROLE_STYLES.user}`}>
                  {userDetail.role}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[userDetail.status] ?? STATUS_STYLES.active}`}>
                  {userDetail.status}
                </span>
                {userDetail.isPremium && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20">
                    Premium
                  </span>
                )}
              </div>

              {userDetail.bio && (
                <p className="text-sm text-zinc-400 leading-relaxed">{userDetail.bio}</p>
              )}

              <div className="text-xs text-zinc-500 space-y-1">
                <p>Cadastrado em {fmt(userDetail.createdAt)}</p>
                {userDetail.lastActiveAt && <p>Ativo em {fmt(userDetail.lastActiveAt)}</p>}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                {[
                  { label: "Reviews",  value: userDetail.stats.reviews },
                  { label: "Listas",   value: userDetail.stats.lists },
                  { label: "Reports",  value: userDetail.stats.reportsFiled },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-xs text-zinc-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {modHistory && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{modHistory.actions.length}</p>
                    <p className="text-xs text-zinc-500">Ações mod.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{modHistory.reportCount}</p>
                    <p className="text-xs text-zinc-500">Reportado</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {userDetail.role !== "admin" && (
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ações</p>

                {updating ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-600">Status</p>
                      <div className="flex gap-2 flex-wrap">
                        {userDetail.status !== "active" && (
                          <button onClick={() => updateStatus("active")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" /> Ativar
                          </button>
                        )}
                        {userDetail.status !== "suspended" && (
                          <button onClick={() => updateStatus("suspended")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                            <ShieldAlert className="w-3.5 h-3.5" /> Suspender
                          </button>
                        )}
                        {userDetail.status !== "banned" && (
                          <button onClick={() => updateStatus("banned")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                            <Ban className="w-3.5 h-3.5" /> Banir
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <p className="text-xs text-zinc-600">Role</p>
                      <div className="flex gap-2 flex-wrap">
                        {(["user", "moderator", "admin"] as const).filter((r) => r !== userDetail.role).map((r) => (
                          <button key={r} onClick={() => updateRole(r)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors capitalize">
                            <Shield className="w-3.5 h-3.5" /> {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Tabs: Login history + Moderation history */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
              {[
                { key: "login" as Tab,      label: "Login",      icon: Monitor },
                { key: "moderation" as Tab, label: "Moderação",  icon: ShieldCheck },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === key ? "bg-accent text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {tab === "login" ? (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-white">Histórico de Login</h3>
                </div>
                {loginHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-sm">
                    <Clock className="w-8 h-8 mb-3 opacity-30" />
                    Sem histórico de login.
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.03]">
                    {loginHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-4 px-6 py-3.5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${entry.success ? "bg-emerald-500" : "bg-red-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-300">{entry.ipAddress ?? "IP desconhecido"}</p>
                          {entry.userAgent && <p className="text-xs text-zinc-600 truncate">{entry.userAgent}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          {entry.deviceType && <span className="text-xs text-zinc-500 capitalize">{entry.deviceType}</span>}
                          <p className="text-xs text-zinc-600">{fmt(entry.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                  <History className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-white">Histórico de Moderação</h3>
                  {modHistory && (
                    <span className="ml-auto text-xs text-zinc-500">
                      {modHistory.reportCount} report{modHistory.reportCount !== 1 ? "s" : ""} recebido{modHistory.reportCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {!modHistory || modHistory.actions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-sm">
                    <ShieldCheck className="w-8 h-8 mb-3 opacity-30" />
                    Sem ações de moderação.
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.03]">
                    {modHistory.actions.map((action) => (
                      <div key={action.id} className="flex items-start gap-4 px-6 py-3.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold capitalize ${ACTION_STYLES[action.action] ?? "text-zinc-400"}`}>
                              {action.action}
                            </span>
                            {action.automated && (
                              <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/5">
                                auto
                              </span>
                            )}
                          </div>
                          {action.reason && (
                            <p className="text-xs text-zinc-500 mt-0.5 truncate">{action.reason}</p>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 shrink-0">{fmt(action.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
