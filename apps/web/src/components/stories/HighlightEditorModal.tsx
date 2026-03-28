"use client";

import * as React from "react";
import Image from "next/image";
import { X, Loader2, Check, Trash2, Camera, ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  useCreateHighlight,
  useUpdateHighlight,
  useDeleteHighlight,
  useAddHighlightItems,
  useRemoveHighlightItem,
  useStoryArchive,
  useHighlightStories,
} from "@/hooks/queries/use-stories";
import { StoryHighlight, Story, api } from "@/lib/api";
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
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Custom cover upload state
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [coverUploading, setCoverUploading] = React.useState(false);

  const isEditing = !!existing;

  const { data: archiveData, isLoading: archiveLoading } = useStoryArchive();
  const archivedStories = archiveData?.data ?? [];

  // When editing, load current stories to pre-select them
  const { data: highlightData, isLoading: highlightLoading } = useHighlightStories(
    existing?.id ?? "",
    isEditing
  );

  React.useEffect(() => {
    if (isEditing && highlightData?.stories) {
      const ids = new Set((highlightData.stories as Story[]).map((s) => s.id));
      setSelectedIds(ids);
    }
  }, [isEditing, highlightData]);

  const createHighlight = useCreateHighlight();
  const updateHighlight = useUpdateHighlight();
  const deleteHighlight = useDeleteHighlight();
  const addItems = useAddHighlightItems();
  const removeItem = useRemoveHighlightItem();

  const isSaving =
    createHighlight.isPending ||
    updateHighlight.isPending ||
    addItems.isPending ||
    removeItem.isPending ||
    coverUploading;

  const toggleStory = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      if (isEditing) {
        // Upload cover if a new file was selected
        let newCoverUrl: string | undefined;
        if (coverFile) {
          setCoverUploading(true);
          const result = await api.highlights.uploadCover(existing.id, coverFile);
          newCoverUrl = result.coverImageUrl;
          setCoverUploading(false);
        }

        await updateHighlight.mutateAsync({
          id: existing.id,
          name: name.trim(),
          ...(newCoverUrl !== undefined ? { cover_image_url: newCoverUrl } : {}),
        });

        // Diff stories
        const currentIds = new Set((highlightData?.stories as Story[] ?? []).map((s) => s.id));
        const toAdd = [...selectedIds].filter((id) => !currentIds.has(id));
        const toRemove = [...currentIds].filter((id) => !selectedIds.has(id));

        await Promise.all([
          toAdd.length > 0 ? addItems.mutateAsync({ id: existing.id, storyIds: toAdd }) : null,
          ...toRemove.map((storyId) => removeItem.mutateAsync({ id: existing.id, storyId })),
        ]);
      } else {
        // For create: we create first, then upload cover if provided
        const created = await createHighlight.mutateAsync({
          name: name.trim(),
          story_ids: Array.from(selectedIds),
        });

        if (coverFile && created.data?.id) {
          setCoverUploading(true);
          await api.highlights.uploadCover(created.data.id, coverFile).catch(() => toast.error("Falha ao enviar capa do highlight"));
          setCoverUploading(false);
        }
      }

      toast.success(isEditing ? "Highlight atualizado!" : "Highlight criado!");
      onSuccess();
    } catch {
      setCoverUploading(false);
      toast.error("Erro ao salvar highlight");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteHighlight.mutateAsync(existing!.id);
      toast.success("Highlight deletado");
      onSuccess();
    } catch {
      toast.error("Erro ao deletar highlight");
    }
  };

  const currentCoverUrl = coverPreview
    ?? (existing?.coverImageUrl ? resolveImage(existing.coverImageUrl) : null);

  const isLoading = isEditing && (archiveLoading || highlightLoading);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="relative w-full sm:max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">{isEditing ? "Editar Highlight" : "Novo Highlight"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Cover image */}
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 block">
                Capa
              </label>
              <div className="flex items-center gap-4">
                {/* Cover preview square */}
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-2xl overflow-hidden bg-zinc-800 border-2 border-dashed border-white/20 hover:border-purple-500/50 transition-colors flex-shrink-0 group/cover"
                >
                  {currentCoverUrl ? (
                    <Image fill src={currentCoverUrl} alt="Capa" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-zinc-600 group-hover/cover:text-purple-400 transition-colors" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors block"
                  >
                    {currentCoverUrl ? "Change image" : "Choose image"}
                  </button>
                  <p className="text-xs text-zinc-600">JPG, PNG or WebP · max 5MB</p>
                  {coverPreview && (
                    <button
                      type="button"
                      onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCoverSelect}
              />
            </div>

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

            {/* Story picker */}
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">
                Stories ({selectedIds.size} selecionados)
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
                          <div className="absolute inset-0 bg-purple-500/30 flex items-start justify-end p-1.5">
                            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delete — only in edit mode */}
            {isEditing && (
              <div className="pt-2 border-t border-white/5">
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete highlight
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-red-300">Are you sure? This action cannot be undone.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={deleteHighlight.isPending}
                        className="flex-1 h-9 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 transition-colors text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                      >
                        {deleteHighlight.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 h-9 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!isLoading && (
          <div className="p-5 border-t border-white/10">
            <button
              onClick={handleSubmit}
              disabled={isSaving || !name.trim()}
              className="w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 transition-colors text-white font-semibold flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? "Salvando..." : isEditing ? "Salvar" : "Criar Highlight"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
