"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, ArrowRightLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { ClubItem } from "./clubs-grid";

interface TransferClubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  club: ClubItem | null;
  onSuccess: () => void;
}

export function TransferClubModal({
  open,
  onOpenChange,
  club,
  onSuccess,
}: TransferClubModalProps) {
  const [loading, setLoading] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club || !newOwnerId.trim()) return;

    setLoading(true);
    try {
      await apiFetch(`/admin/clubs/${club.id}/owner`, {
        method: "PATCH",
        body: { newOwnerId: newOwnerId.trim() },
      });
      toast.success("Dono do club transferido com sucesso!");
      onSuccess();
      onOpenChange(false);
      setNewOwnerId("");
    } catch {
      toast.error("Falha ao transferir club (verifique se o ID está correto).");
    } finally {
      setLoading(false);
    }
  };

  if (!club) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm glass-card rounded-2xl p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-base font-semibold text-white">Transferir Club</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-zinc-500 hover:text-zinc-300 transition-colors p-2 -mr-2">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          
          <div className="text-sm text-zinc-400 mb-4 bg-yellow-500/10 text-yellow-500 p-3 rounded-xl border border-yellow-500/20">
            Você está prestes a transferir a posse do club <strong className="text-yellow-400">{club.name}</strong> para outro usuário. Esta ação é imediata.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">ID do Novo Dono</label>
              <input
                required
                value={newOwnerId}
                onChange={(e) => setNewOwnerId(e.target.value)}
                placeholder="Ex: 550e8400-e29b-41d4-a716-446655440000"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading || !newOwnerId.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black text-sm font-semibold transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                Transferir
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
