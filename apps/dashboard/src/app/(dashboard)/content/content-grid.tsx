"use client";

import { useState } from "react";
import { Film, Search, Loader2, RefreshCw, Star, Tv, MoreVertical, Edit2, Trash2, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useApiQuery } from "@/hooks/use-api-query";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/ui/error-banner";
import Image from "next/image";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuDangerItem } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditMediaModal, FullMediaItem } from "./edit-media-modal";
import { CreateMediaModal } from "./create-media-modal";
import { toast } from "sonner";

export interface MediaItem extends FullMediaItem {
  year?: number | null;
  rating?: number | null;
}

const limit = 24;

export function ContentGrid() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("q", search);

  const { data, isLoading, error, refetch } = useApiQuery<{ data: MediaItem[]; total: number }>({
    queryKey: ["admin-media", search, String(page)],
    path: `/media/library?${params}`,
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/admin/media/${deleteConfirm.id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      toast.success("Mídia excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
    } catch {
      toast.error("Erro ao excluir mídia.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        section="Content"
        title="Catálogo"
        icon={Film}
        badge={total}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
            >
              <Plus className="w-4 h-4" />
              Nova Mídia
            </button>
          </div>
        }
      />

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por título..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent/40 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          Buscar
        </button>
      </form>

      {error && <ErrorBanner message="Falha ao carregar mídias." />}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-sm">
          <Film className="w-10 h-10 mb-3 opacity-30" />
          <p>Nenhuma mídia encontrada.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <div key={item.id} className="space-y-2 group">
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 border border-white/5 relative">
                  {item.posterPath ? (
                    <Image
                      src={item.posterPath}
                      fill
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      {item.type === "tv" ? (
                        <Tv className="w-8 h-8" />
                      ) : (
                        <Film className="w-8 h-8" />
                      )}
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.type === "tv" ? "bg-blue-500/80 text-white" : "bg-purple-500/80 text-white"}`}
                    >
                      {item.type === "tv" ? "Série" : "Filme"}
                    </span>
                  </div>
                  {item.rating != null && item.rating > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-black/70 rounded-md px-1.5 py-0.5 pointer-events-none">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-bold text-white">
                        {Number(item.rating).toFixed(1)}
                      </span>
                    </div>
                  )}

                  <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-7 h-7 bg-black/70 hover:bg-black text-white rounded-md flex items-center justify-center transition-colors shadow-lg">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingItem(item)}>
                          <Edit2 className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuDangerItem onClick={() => setDeleteConfirm(item)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuDangerItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-300 truncate">
                    {item.title}
                  </p>
                  {item.year && (
                    <p className="text-[11px] text-zinc-600">{item.year}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 border border-white/10 disabled:opacity-30 transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-zinc-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 border border-white/10 disabled:opacity-30 transition-colors"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <EditMediaModal
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        media={editingItem}
        onSuccess={(updated) => {
          queryClient.invalidateQueries({ queryKey: ["admin-media"] });
          setEditingItem(null);
        }}
      />

      {createModalOpen && (
        <CreateMediaModal onClose={() => setCreateModalOpen(false)} />
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Excluir Mídia"
        description={`Tem certeza que deseja excluir "${deleteConfirm?.title}"? Esta ação removerá a mídia e todas as referências a ela (reviews, listas, etc).`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
}
