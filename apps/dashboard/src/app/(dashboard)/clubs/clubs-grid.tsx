"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Users, Globe, Lock, Loader2, RefreshCw, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { resolveImage } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";
import Image from "next/image";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuDangerItem } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { MoreVertical, Edit2, ArrowRightLeft, Trash2 } from "lucide-react";
import { EditClubModal } from "./edit-club-modal";
import { TransferClubModal } from "./transfer-club-modal";

export interface ClubItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  coverUrl?: string | null;
  memberCount: number;
  isPublic: boolean;
}

export function ClubsGrid() {
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingClub, setEditingClub] = useState<ClubItem | null>(null);
  const [transferringClub, setTransferringClub] = useState<ClubItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ClubItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (search) params.set("search", search);
      const res = await apiFetch<{ data: ClubItem[]; total: number }>(`/admin/clubs?${params}`);
      setClubs(res.data);
      setTotal(res.total);
    } catch {
      setError("Falha ao carregar clubs.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/admin/clubs/${deleteConfirm.id}`, { method: "DELETE" });
      setClubs((prev) => prev.filter((i) => i.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      toast.success("Club excluído com sucesso!");
    } catch {
      toast.error("Erro ao excluir club.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="Clubs"
        title="Clubs"
        icon={Zap}
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
            placeholder="Buscar clubs..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent/40 transition-colors"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors">
          Buscar
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : clubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-sm">
          <Zap className="w-10 h-10 mb-3 opacity-30" />
          <p>Nenhum club encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clubs.map((club) => (
            <div key={club.id} className="glass-card rounded-2xl overflow-hidden relative group">
              <div className="h-20 bg-zinc-800 relative overflow-hidden">
                {club.coverUrl
                  ? <Image src={resolveImage(club.coverUrl) ?? ""} fill alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center opacity-10"><Zap className="w-10 h-10" /></div>
                }
                <div className="absolute top-2 right-2">
                  {club.isPublic
                    ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"><Globe className="w-3 h-3" /> Público</span>
                    : <span className="flex items-center gap-1 text-xs font-medium text-zinc-400 bg-zinc-800/80 border border-zinc-700 px-2 py-0.5 rounded-full"><Lock className="w-3 h-3" /> Privado</span>
                  }
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-white truncate">{club.name}</h3>
                {club.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{club.description}</p>}
                <div className="flex items-center gap-1.5 mt-3 text-xs text-zinc-500">
                  <Users className="w-3.5 h-3.5" /> {club.memberCount} membros
                </div>
              </div>
              
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-7 h-7 bg-black/70 hover:bg-black text-white rounded-md flex items-center justify-center transition-colors shadow-lg">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setEditingClub(club)}>
                      <Edit2 className="w-4 h-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTransferringClub(club)}>
                      <ArrowRightLeft className="w-4 h-4 mr-2" /> Transferir Dono
                    </DropdownMenuItem>
                    <DropdownMenuDangerItem onClick={() => setDeleteConfirm(club)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </DropdownMenuDangerItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <EditClubModal
        open={!!editingClub}
        onOpenChange={(open) => !open && setEditingClub(null)}
        club={editingClub}
        onSuccess={(updated) => {
          setClubs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        }}
      />

      <TransferClubModal
        open={!!transferringClub}
        onOpenChange={(open) => !open && setTransferringClub(null)}
        club={transferringClub}
        onSuccess={() => { /* Don't strictly need to refresh row just for owner change, but we could */ }}
      />
      
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Excluir Club"
        description={`Tem certeza que deseja excluir "${deleteConfirm?.name}"? Isso removerá todas as discussões, posts e membros associados a este club permanentemente.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
}
