"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { ReviewItem } from "./search-discussions";

interface EditReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: ReviewItem | null;
  onSuccess: (updatedReview: any) => void;
}

export function EditReviewModal({
  open,
  onOpenChange,
  review,
  onSuccess,
}: EditReviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    content: "",
    containsSpoilers: false,
    isHidden: false,
    hiddenReason: "",
  });

  useEffect(() => {
    if (review && open) {
      setFormData({
        content: review.content || "",
        containsSpoilers: review.containsSpoilers || false,
        isHidden: review.isHidden || false,
        hiddenReason: review.hiddenReason || "",
      });
    } else {
      setFormData({ content: "", containsSpoilers: false, isHidden: false, hiddenReason: "" });
    }
  }, [review, open]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review) return;

    setLoading(true);
    try {
      const res = await apiFetch<{ data: any }>(`/admin/reviews/${review.id}`, {
        method: "PATCH",
        body: formData,
      });
      toast.success("Review atualizado com sucesso!");
      onSuccess(res.data);
      onOpenChange(false);
    } catch {
      toast.error("Falha ao atualizar review.");
    } finally {
      setLoading(false);
    }
  };

  if (!review) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg glass-card rounded-2xl p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-white">Moderar Review</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-zinc-500 hover:text-zinc-300 transition-colors p-2 -mr-2">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Conteúdo do Review</label>
              <textarea
                name="content"
                required
                rows={5}
                value={formData.content}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40 resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="containsSpoilers"
                checked={formData.containsSpoilers}
                onChange={(e) => setFormData((p) => ({ ...p, containsSpoilers: e.target.checked }))}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-accent focus:ring-accent focus:ring-opacity-25"
              />
              <label htmlFor="containsSpoilers" className="text-sm text-zinc-300">
                Contém Spoilers
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isHidden"
                checked={formData.isHidden}
                onChange={(e) => setFormData((p) => ({ ...p, isHidden: e.target.checked }))}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-red-500 focus:ring-red-500 focus:ring-opacity-25"
              />
              <label htmlFor="isHidden" className="text-sm text-zinc-300 font-medium text-red-400">
                Ocultar Review por violação de regras
              </label>
            </div>

            {formData.isHidden && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in">
                <label className="text-sm font-medium text-red-300">Motivo da Moderação (Visível para o usuário)</label>
                <input
                  name="hiddenReason"
                  required={formData.isHidden}
                  value={formData.hiddenReason}
                  onChange={handleChange}
                  placeholder="Ex: Discurso de ódio / Linguagem ofensiva"
                  className="w-full px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-white focus:outline-none focus:border-red-400/50 placeholder:text-red-900/40"
                />
              </div>
            )}

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
                Salvar Alterações
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
