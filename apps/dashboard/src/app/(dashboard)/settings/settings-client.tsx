"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings, User, Shield, Bell, Palette, Globe, Lock,
  Eye, EyeOff, Check, Loader2, Monitor, Database, Wifi,
  LogOut, RefreshCw, Smartphone, Laptop, ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  twoFactorEnabled?: boolean;
}

interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt?: string;
  isCurrent?: boolean;
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2 pb-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-accent" />
        </div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-white mt-0.5">{value}</p>
        {hint && <p className="text-xs text-zinc-600 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

export function SettingsClient({ user }: { user: AdminUser | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Password change state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Sessions
  const sessionsQuery = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/auth/list-sessions", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return (data ?? []) as Session[];
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch("/api/auth/revoke-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Falha ao revogar sessão");
    },
    onSuccess: () => {
      toast.success("Sessão revogada");
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
    },
    onError: () => toast.error("Erro ao revogar sessão"),
  });

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/revoke-other-sessions", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Falha ao revogar sessões");
    },
    onSuccess: () => {
      toast.success("Todas as outras sessões foram revogadas");
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
    },
    onError: () => toast.error("Erro ao revogar sessões"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message ?? "Erro ao alterar senha");
      }
    },
    onSuccess: () => {
      setPwSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast.success("Senha alterada com sucesso");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPw.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres");
      return;
    }
    changePasswordMutation.mutate();
  };

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return Monitor;
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return Smartphone;
    return Laptop;
  };

  const getBrowserName = (userAgent?: string) => {
    if (!userAgent) return "Navegador desconhecido";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Outro";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader section="Admin" title="Configurações" icon={Settings} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile section */}
        <SectionCard title="Perfil do Administrador" icon={User}>
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent text-lg font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{user?.name ?? "—"}</p>
              <p className="text-sm text-zinc-500 truncate">{user?.email ?? "—"}</p>
            </div>
            <span className="ml-auto shrink-0 px-2 py-1 rounded-md text-xs font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">
              {user?.role === "admin" ? "Admin" : "Moderador"}
            </span>
          </div>
          <FieldRow label="ID" value={user?.id ?? "—"} hint="Identificador único do usuário" />
          <FieldRow label="2FA" value={user?.twoFactorEnabled ? "Ativado" : "Desativado"} hint="Autenticação de dois fatores" />
        </SectionCard>

        {/* Change password */}
        <SectionCard title="Alterar Senha" icon={Lock}>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Senha atual</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  className="w-full px-3 pr-9 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 focus:bg-white/[0.08] transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Nova senha</label>
              <input
                type={showPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 focus:bg-white/[0.08] transition-all"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Confirmar nova senha</label>
              <input
                type={showPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                className={`w-full px-3 py-2.5 rounded-lg bg-white/5 border text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-all ${
                  confirmPw && newPw !== confirmPw
                    ? "border-red-500/50 focus:border-red-500"
                    : "border-white/10 focus:border-accent/50 focus:bg-white/[0.08]"
                }`}
                placeholder="Repita a nova senha"
              />
            </div>
            <button
              type="submit"
              disabled={changePasswordMutation.isPending || !currentPw || !newPw || !confirmPw}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "var(--accent)" }}
            >
              {changePasswordMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Alterando...</>
              ) : pwSuccess ? (
                <><Check className="w-4 h-4" /> Senha alterada</>
              ) : (
                "Alterar senha"
              )}
            </button>
          </form>
        </SectionCard>
      </div>

      {/* Sessions section */}
      <SectionCard title="Sessões Ativas" icon={Shield}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-zinc-400">Dispositivos com sessão aberta nesta conta.</p>
          <button
            onClick={() => revokeAllMutation.mutate()}
            disabled={revokeAllMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {revokeAllMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
            Revogar outras
          </button>
        </div>

        {sessionsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.02]" />
            ))}
          </div>
        ) : sessionsQuery.data && sessionsQuery.data.length > 0 ? (
          <div className="space-y-2">
            {sessionsQuery.data.map((session) => {
              const DeviceIcon = getDeviceIcon(session.userAgent);
              const isCurrent = session.isCurrent;
              return (
                <div
                  key={session.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    isCurrent ? "bg-accent/5 border-accent/20" : "bg-white/[0.02] border-white/5"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCurrent ? "bg-accent/15 text-accent" : "bg-white/5 text-zinc-400"}`}>
                    <DeviceIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{getBrowserName(session.userAgent)}</p>
                      {isCurrent && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium">Atual</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">
                      {session.ipAddress && `${session.ipAddress} · `}
                      {session.createdAt && format(new Date(session.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => revokeSessionMutation.mutate(session.id)}
                      disabled={revokeSessionMutation.isPending}
                      className="text-xs text-zinc-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                    >
                      Revogar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-600 py-2">Nenhuma sessão ativa encontrada.</p>
        )}
      </SectionCard>

      {/* Quick links */}
      <SectionCard title="Acesso Rápido" icon={Globe}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: "Audit Logs", desc: "Histórico de ações", href: "/audit-logs", icon: Shield, color: "text-purple-400" },
            { label: "Blocklist", desc: "Palavras bloqueadas", href: "/system/blocklist", icon: Database, color: "text-blue-400" },
            { label: "Infraestrutura", desc: "Status dos serviços", href: "/system", icon: Wifi, color: "text-emerald-400" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group"
            >
              <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${link.color}`}>
                <link.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{link.label}</p>
                <p className="text-xs text-zinc-500">{link.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </a>
          ))}
        </div>
      </SectionCard>

      {/* Appearance section */}
      <SectionCard title="Aparência" icon={Palette}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-sm font-medium text-white">Tema</p>
              <p className="text-xs text-zinc-500">Interface escura cinematográfica</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-400">
              <Monitor className="w-3.5 h-3.5" />
              Dark
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-sm font-medium text-white">Cor de destaque</p>
              <p className="text-xs text-zinc-500">Púrpura · oklch(0.7 0.2 280)</p>
            </div>
            <div className="w-8 h-8 rounded-lg border border-white/10" style={{ background: "var(--accent)" }} />
          </div>
          <p className="text-xs text-zinc-600 italic">Mais opções de personalização serão adicionadas em breve.</p>
        </div>
      </SectionCard>
    </div>
  );
}
