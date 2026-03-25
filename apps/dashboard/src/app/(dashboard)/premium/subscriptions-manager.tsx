"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus, MoreVertical, ShieldAlert, Loader2, RefreshCw, X, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiFetch } from "@/lib/api";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDebounce } from "@/hooks/use-debounce";

interface User {
  id: string;
  displayName: string | null;
  username: string;
  email: string;
  avatarUrl: string | null;
}

interface Subscription {
  id: string;
  userId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    displayName: string | null;
    username: string;
    email: string;
    avatarUrl: string | null;
  };
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
}

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  canceled: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  past_due: "text-red-400 bg-red-500/10 border-red-500/20",
  incomplete: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

export function SubscriptionsManager() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  
  // Modals state
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-subscriptions", page, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: page.toString(), limit: "15" });
      if (statusFilter) params.append("status", statusFilter);
      return apiFetch<{ data: Subscription[]; total: number }>(`/admin/subscriptions?${params}`);
    },
    refetchInterval: 60_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/subscriptions/${id}/revoke`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Assinatura revogada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions-at-risk"] });
      setRevokingId(null);
    },
    onError: () => {
      toast.error("Erro ao revogar assinatura");
      setRevokingId(null);
    },
  });

  const subs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 15);

  return (
    <div className="mt-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
            <CreditCard className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Gerenciar Assinaturas</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Visão geral de membros premium</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-accent/50"
          >
            <option value="">Todos os status</option>
            <option value="active">Active</option>
            <option value="canceled">Canceled</option>
            <option value="past_due">Past Due</option>
            <option value="incomplete">Incomplete</option>
          </select>
          
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors disabled:opacity-30"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          
          <button
            onClick={() => setGrantModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors text-xs font-semibold shadow-lg shadow-accent/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Conceder Premium
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 overflow-hidden bg-zinc-900/40">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          <div>Usuário</div>
          <div>Status</div>
          <div>Início</div>
          <div>Renovação/Fim</div>
          <div className="text-right">Ações</div>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : subs.length === 0 ? (
          <div className="px-5 py-12 text-center text-zinc-500 text-sm">
            Nenhuma assinatura encontrada.
          </div>
        ) : (
          subs.map((sub, i) => {
            const statusConfig = STATUS_COLORS[sub.status] || STATUS_COLORS.canceled;
            return (
              <div key={sub.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 border-b border-white/[0.03] last:border-0 ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0 overflow-hidden relative border border-white/5">
                    {sub.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sub.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase">
                        {sub.user.username.substring(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{sub.user.displayName || sub.user.username}</p>
                    <p className="text-xs text-zinc-500 truncate">{sub.user.email}</p>
                  </div>
                </div>
                
                <div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${statusConfig}`}>
                    {sub.status.replace("_", " ")}
                  </span>
                  {sub.cancelAtPeriodEnd && (
                    <span className="block mt-1 text-[10px] text-amber-400">cancela no fim</span>
                  )}
                </div>
                
                <div className="text-xs text-zinc-400 font-mono">
                  {formatDate(sub.currentPeriodStart)}
                </div>
                
                <div className="text-xs text-zinc-400 font-mono">
                  {formatDate(sub.currentPeriodEnd)}
                </div>
                
                <div className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-zinc-900 border border-white/10 shadow-xl rounded-xl overflow-hidden p-1">
                      <DropdownMenuItem 
                        onClick={() => setRevokingId(sub.id)}
                        disabled={sub.status === "canceled"}
                        className="text-red-400 focus:bg-red-500/10 focus:text-red-300 text-xs py-2 px-3 rounded-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Revogar Premium
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-xs text-zinc-500">Mostrando página {page} de {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Grant Modal */}
      {grantModalOpen && (
        <GrantPremiumModal onClose={() => setGrantModalOpen(false)} />
      )}

      {/* Revoke Confirmation */}
      <ConfirmDialog
        open={!!revokingId}
        onOpenChange={(op) => !op && setRevokingId(null)}
        onConfirm={() => revokingId && revokeMutation.mutate(revokingId)}
        title="Revogar Assinatura"
        description="Tem certeza que deseja cancelar imediatamente a assinatura premium deste usuário? Esta ação não pode ser desfeita e ele perderá o acesso instantaneamente."
        confirmLabel="Sim, revogar"
        loading={revokeMutation.isPending}
        variant="danger"
      />
    </div>
  );
}

function GrantPremiumModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [days, setDays] = useState("30");

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ["admin-users-search", debouncedSearch],
    queryFn: () => apiFetch<{ data: User[] }>(`/admin/user?q=${encodeURIComponent(debouncedSearch)}&limit=5`),
    enabled: debouncedSearch.length >= 2,
  });

  const grantMutation = useMutation({
    mutationFn: (body: { userId: string; expiresAt: string | null }) => 
      apiFetch("/admin/subscriptions/grant", { method: "POST", body }),
    onSuccess: () => {
      toast.success("Premium concedido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      onClose();
    },
    onError: () => toast.error("Erro ao conceder premium"),
  });

  const handleGrant = () => {
    if (!selectedUser) return;
    
    let expiresAt: string | null = null;
    if (days !== "lifetime") {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(days, 10));
      expiresAt = d.toISOString();
    }
    
    grantMutation.mutate({ userId: selectedUser.id, expiresAt });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-base font-semibold text-white">Conceder Premium Manual</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* User Selection */}
          {!selectedUser ? (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Buscar Usuário</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Nome, username ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent/50"
                  autoFocus
                />
                {isFetching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-500" />
                )}
              </div>
              
              {debouncedSearch.length >= 2 && searchResults?.data && (
                <div className="mt-2 bg-black/20 border border-white/5 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {searchResults.data.length === 0 ? (
                    <div className="p-3 text-xs text-center text-zinc-500">Nenhum encontrado</div>
                  ) : (
                    searchResults.data.map(user => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className="w-full text-left p-3 hover:bg-white/5 transition-colors border-b border-white/5 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                          {user.avatarUrl && <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{user.displayName || user.username}</p>
                          <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-accent/30 bg-accent/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0 border border-white/10">
                  {selectedUser.avatarUrl && <img src={selectedUser.avatarUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{selectedUser.displayName || selectedUser.username}</p>
                  <p className="text-xs text-zinc-400">{selectedUser.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-[10px] font-medium text-accent hover:text-white uppercase tracking-wider px-2 py-1 rounded bg-accent/10 border border-accent/20"
              >
                Trocar
              </button>
            </div>
          )}

          {/* Duration Selection */}
          {selectedUser && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-medium text-zinc-400 mb-2">Duração (Dias)</label>
              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent/50"
              >
                <option value="7">7 Dias (Trial)</option>
                <option value="30">30 Dias (Mensal)</option>
                <option value="365">365 Dias (Anual)</option>
                <option value="lifetime">Vitalício</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-6">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleGrant}
              disabled={!selectedUser || grantMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {grantMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Conceder Acesso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
