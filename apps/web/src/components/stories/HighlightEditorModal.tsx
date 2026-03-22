"use client";

import * as React from "react";
import Image from "next/image";
import { X, Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useCreateHighlight, useUpdateHighlight, useStoryArchive } from "@/hooks/queries/use-stories";
import { StoryHighlight } from "@/lib/api";
import { resolveImage } from "@/lib/utils";
import { toast } from "sonner";

interface HighlightEditorModalProps {
  existing?: StoryHighlight;
  onClose: () => void;
  onSuccess: () => void;
}

export function HighlightEditorModal({ existing, onClose, onSuccess }: HighlightEditorModalProps) {
  const [name, setName] = React.useState(existing?.name ?? "");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const { data: archiveData, isLoading: archiveLoading } = useStoryArchive();
  const archivedStories = archiveData?.data ?? [];

  const createHighlight = useCreateHighlight();
  const updateHighlight = useUpdateHighlight();

  const isEditing = !!existing;
  const isPending = createHighlight.isPending || updateHighlight.isPending;

  const toggleStory = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    try {
      if (isEditing) {
        await updateHighlight.mutateAsync({ id: existing.id, name: name.trim() });
      } else {
        await createHighlight.mutateAsync({
          name: name.trim(),
          story_ids: Array.from(selectedIds),
        });
      }
      toast.success(isEditing ? "Highlight atualizado!" : "Highlight criado!");
      onSuccess();
    } catch {
      toast.error("Erro ao salvar highlight");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="relative w-full sm:max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">{isEditing ? "Editar Highlight" : "Novo Highlight"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Favoritos, Viagens, 2024..."
              maxLength={50}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/30"
            />
          </div>

          {/* Story picker — only shown when creating */}
          {!isEditing && (
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">
                Adicionar stories ({selectedIds.size} selecionados)
              </label>
              {archiveLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                </div>
              ) : archivedStories.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-6">Nenhum story arquivado</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {archivedStories.map((story) => {
                    const selected = selectedIds.has(story.id);
                    return (
                      <button
                        key={story.id}
                        onClick={() => toggleStory(story.id)}
                        className="relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all"
                        style={{ borderColor: selected ? "rgb(168 85 247)" : "transparent" }}
                      >
                        {story.imageUrl ? (
                          <Image
                            fill
                            src={resolveImage(story.imageUrl) || ""}
                            alt=""
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            <span className="text-[10px] text-zinc-600 uppercase font-bold">{story.type}</span>
                          </div>
                        )}
                        {selected && (
                          <div className="absolute inset-0 bg-purple-500/30 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10">
          <button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            className="w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 transition-colors text-white font-semibold flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? "Salvar" : "Criar Highlight"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
