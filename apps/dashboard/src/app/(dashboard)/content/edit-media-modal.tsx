"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export interface FullMediaItem {
  id: string;
  title: string;
  originalTitle?: string | null;
  type: "movie" | "tv";
  tagline?: string | null;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
}

interface EditMediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: FullMediaItem | null;
  onSuccess: (updatedMedia: FullMediaItem) => void;
}

export function EditMediaModal({
  open,
  onOpenChange,
  media,
  onSuccess,
}: EditMediaModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<FullMediaItem>>({});

  useEffect(() => {
    if (media && open) {
      // Only copy editable fields — exclude id, type and any other read-only fields
      setFormData({
        title: media.title,
        originalTitle: media.originalTitle,
        tagline: media.tagline,
        overview: media.overview,
        posterPath: media.posterPath,
        backdropPath: media.backdropPath,
        releaseDate: media.releaseDate,
      });
    } else {
      setFormData({});
    }
  }, [media, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!media) return;

    setLoading(true);
    try {
      const res = await apiFetch<{ data: FullMediaItem }>(`/admin/media/${media.id}`, {
        method: "PATCH",
        body: formData,
      });
      toast.success("Media updated successfully!");
      onSuccess(res.data);
      onOpenChange(false);
    } catch {
      toast.error("Failed to update media.");
    } finally {
      setLoading(false);
    }
  };

  if (!media) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card rounded-2xl p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-white">Edit Media</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-zinc-500 hover:text-zinc-300 transition-colors p-2 -mr-2">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Title</label>
                <input
                  required
                  name="title"
                  value={formData.title || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Original Title</label>
                <input
                  name="originalTitle"
                  value={formData.originalTitle || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Release Date</label>
                <input
                  type="date"
                  name="releaseDate"
                  value={formData.releaseDate ? String(formData.releaseDate).split("T")[0] : ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Tagline</label>
                <input
                  name="tagline"
                  value={formData.tagline || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Overview</label>
              <textarea
                name="overview"
                rows={4}
                value={formData.overview || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Poster URL</label>
                <input
                  name="posterPath"
                  value={formData.posterPath || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Backdrop URL</label>
                <input
                  name="backdropPath"
                  value={formData.backdropPath || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/40"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
