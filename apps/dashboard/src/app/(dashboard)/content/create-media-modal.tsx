"use client";

import { useState } from "react";
import { X, Loader2, Film } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface CreateMediaModalProps {
  onClose: () => void;
}

export function CreateMediaModal({ onClose }: CreateMediaModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    originalTitle: "",
    type: "movie",
    tmdbId: "",
    status: "Released",
    releaseDate: "",
    runtime: "",
    posterPath: "",
    backdropPath: "",
    overview: "",
    tagline: "",
  });

  const mutation = useMutation({
    mutationFn: (body: any) => apiFetch("/admin/media", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      toast.success("Mídia criada com sucesso!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar mídia.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;

    mutation.mutate({
      title: form.title,
      type: form.type,
      originalTitle: form.originalTitle || null,
      tmdbId: form.tmdbId ? parseInt(form.tmdbId, 10) : undefined,
      status: form.status,
      releaseDate: form.releaseDate || null,
      runtime: form.runtime ? parseInt(form.runtime, 10) : null,
      posterPath: form.posterPath || null,
      backdropPath: form.backdropPath || null,
      overview: form.overview || null,
      tagline: form.tagline || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 sticky top-0 bg-zinc-900 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 text-accent rounded-lg border border-accent/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Criar Nova Mídia</h2>
              <p className="text-xs text-zinc-500">Inserção manual de título</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Título (PT-BR) *</label>
              <input
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent/50"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Título Original</label>
              <input
                value={form.originalTitle}
                onChange={(e) => setForm(f => ({ ...f, originalTitle: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tipo *</label>
              <select
                value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
              >
                <option value="movie">Filme</option>
                <option value="tv">Série</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">TMDB ID (Opcional)</label>
              <input
                type="number"
                value={form.tmdbId}
                onChange={(e) => setForm(f => ({ ...f, tmdbId: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent/50"
                placeholder="Ex: 550"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Data de Lançamento</label>
              <input
                type="date"
                value={form.releaseDate}
                onChange={(e) => setForm(f => ({ ...f, releaseDate: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Duração (minutos)</label>
              <input
                type="number"
                value={form.runtime}
                onChange={(e) => setForm(f => ({ ...f, runtime: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent/50"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Sinopse</label>
              <textarea
                value={form.overview}
                onChange={(e) => setForm(f => ({ ...f, overview: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent/50 resize-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Slogan da obra (Tagline)</label>
              <input
                value={form.tagline}
                onChange={(e) => setForm(f => ({ ...f, tagline: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent/50"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">URL do Poster (TMDb / https)</label>
              <input
                value={form.posterPath}
                onChange={(e) => setForm(f => ({ ...f, posterPath: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent/50"
                placeholder="/path.jpg ou https://..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">URL do Backdrop</label>
              <input
                value={form.backdropPath}
                onChange={(e) => setForm(f => ({ ...f, backdropPath: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !form.title}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Mídia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
