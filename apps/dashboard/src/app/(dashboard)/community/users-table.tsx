"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Search, Ban, CheckCircle, Loader2,
  ChevronLeft, ChevronRight, ShieldAlert, RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  username?: string | null;
  role: string;
  status?: string | null;
  createdAt: string;
  image?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  suspended: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  banned: "text-red-400 bg-red-500/10 border-red-500/20",
};

export function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("q", search);
      const res = await apiFetch<{ data: AdminUser[]; total: number }>(`/admin/user?${params}`);
      setUsers(res.data);
      setTotal(res.total);
    } catch {
      setError("Falha ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (userId: string, status: "active" | "suspended" | "banned") => {
    setUpdating(userId);
    try {
      await apiFetch(`/admin/user/${userId}/status`, {
        method: "PATCH",
        body: { status },
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
    } catch {
      setError("Falha ao atualizar status.");
    } finally {
      setUpdating(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="Community"
        title="Usuários"
        icon={Users}
        badge={total}
        actions={
          <button onClick={load} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent/40 transition-colors"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors">
          Buscar
        </button>
      </form>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="rounded-2xl border border-white/5 overflow-hidden bg-zinc-900/40">
        <div className="grid grid-cols-[1fr_180px_100px_80px_160px] text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-white/5">
          <div className="px-5 py-3">Usuário</div>
          <div className="px-4 py-3">Email</div>
          <div className="px-4 py-3">Role</div>
          <div className="px-4 py-3">Status</div>
          <div className="px-4 py-3 text-right">Ações</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-sm">
            <Users className="w-8 h-8 mb-3 opacity-40" />
            Nenhum usuário encontrado.
          </div>
        ) : (
          users.map((u, i) => {
            const status = u.status || "active";
            const isUpdating = updating === u.id;
            return (
              <div key={u.id} className={`grid grid-cols-[1fr_180px_100px_80px_160px] border-b border-white/[0.03] last:border-0 ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
                <div className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {u.image
                      ? <img src={u.image} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold text-zinc-400">{(u.name || u.email)?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.name || "—"}</p>
                    {u.username && <p className="text-xs text-zinc-500 truncate">@{u.username}</p>}
                  </div>
                </div>
                <div className="flex items-center px-4 py-3.5">
                  <span className="text-xs text-zinc-400 truncate">{u.email}</span>
                </div>
                <div className="flex items-center px-4 py-3.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${u.role === "admin" ? "text-purple-400 bg-purple-500/10 border-purple-500/20" : "text-zinc-400 bg-zinc-800/60 border-zinc-700"}`}>
                    {u.role}
                  </span>
                </div>
                <div className="flex items-center px-4 py-3.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.active}`}>
                    {status}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1.5 px-4 py-3.5">
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                  ) : (
                    <>
                      {status !== "active" && (
                        <button onClick={() => updateStatus(u.id, "active")} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                          <CheckCircle className="w-3.5 h-3.5" /> Ativar
                        </button>
                      )}
                      {status !== "suspended" && u.role !== "admin" && (
                        <button onClick={() => updateStatus(u.id, "suspended")} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                          <ShieldAlert className="w-3.5 h-3.5" /> Suspender
                        </button>
                      )}
                      {status !== "banned" && u.role !== "admin" && (
                        <button onClick={() => updateStatus(u.id, "banned")} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                          <Ban className="w-3.5 h-3.5" /> Banir
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-medium">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
