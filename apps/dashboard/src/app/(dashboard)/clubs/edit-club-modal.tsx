"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { ClubItem } from "./clubs-grid";

interface EditClubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  club: ClubItem | null;
  onSuccess: (updatedClub: ClubItem) => void;
}

export function EditClubModal({
  open,
  onOpenChange,
  club,
  onSuccess,
}: EditClubModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
    isArchived: false,
  });

  useEffect(() => {
    if (club && open) {
      setFormData({
        name: club.name || "",
        description: club.description || "",
        isPrivate: club.isPublic === false,
        isArchived: (club as any).isArchived || false,
      });
    } else {
      setFormData({ name: "", description: "", isPrivate: false, isArchived: false });
    }
  }, [club, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club) return;

    setLoading(true);
    try {
      const res = await apiFetch<{ data: any }>(`/admin/clubs/${club.id}`, {
        method: "PATCH",
        body: formData,
      });
      toast.success("Club atualizado com sucesso!");
      
      onSuccess({
        ...club,
        name: formData.name,
        description: formData.description,
        isPublic: !formData.isPrivate,
        // We inject it back so the table can update smoothly without refresh
      });
      onOpenChange(false);
    } catch {
      toast.error("Falha ao atualizar club.");
    } finally {
      setLoading(false);
    }
  };

  if (!club) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg glass-card rounded-2xl p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-white">Editar Club</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-zinc-500 hover:text-zinc-300 transition-colors p-2 -mr-2">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Nome</label>
              <input
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Descrição</label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="isPrivate"
                checked={formData.isPrivate}
                onChange={(e) => setFormData((p) => ({ ...p, isPrivate: e.target.checked }))}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-accent focus:ring-accent focus:ring-opacity-25"
              />
              <label htmlFor="isPrivate" className="text-sm text-zinc-300">
                Club Privado (Apenas convidados)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isArchived"
                checked={formData.isArchived}
                onChange={(e) => setFormData((p) => ({ ...p, isArchived: e.target.checked }))}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-accent focus:ring-accent focus:ring-opacity-25"
              />
              <label htmlFor="isArchived" className="text-sm text-zinc-300">
                Arquivado (Oculto de buscas e sem novos posts)
              </label>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
