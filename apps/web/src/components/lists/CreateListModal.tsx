"use client";

import * as React from "react";
import { X, List as ListIcon, Globe, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn, resolveImage } from "@/lib/utils";
import { MediaSearchInput } from "@/components/media/media-search-input";
import type { SearchResult } from "@/types";
import Image from "next/image";

interface CreateListModalProps {
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateListModal({ initialData, onClose, onSuccess }: CreateListModalProps) {
  const [name, setName] = React.useState(initialData?.name || "");
  const [description, setDescription] = React.useState(initialData?.description || "");
  const [isPublic, setIsPublic] = React.useState(initialData?.isPublic ?? true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = React.useState<Pick<SearchResult, "id" | "localId" | "title" | "posterPath" | "mediaType" | "localSlug">[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (initialData?.id) {
        await api.lists.update(initialData.id, {
          name,
          description,
          isPublic,
        });
      } else {
        await api.lists.create({
          name,
          description,
          isPublic,
          item_ids: selectedMedia.map(m => m.localId ?? String(m.id)).filter(Boolean),
        });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save list");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div 
        className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ListIcon className="w-5 h-5" />
             </div>
             <h2 className="text-xl font-bold text-white">
               {initialData ? "Edit List" : "Create New List"}
             </h2>
           </div>
           <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="rounded-full text-zinc-500 hover:text-white"
          >
             <X className="w-5 h-5" />
           </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">List Name</label>
            <Input 
              placeholder="e.g., My Favorite Scifi Movies"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 bg-white/5 border-white/10 text-white focus:border-purple-500/50 transition-all px-4"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Description (Optional)</label>
            <textarea 
              placeholder="Tell others what this list is about..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-32 rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-white focus:border-purple-500/50 transition-all outline-none resize-none"
            />
          </div>

          <div className="space-y-4">
             <div className="flex flex-col gap-2">
               <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Add initial media</label>
               <MediaSearchInput
                variant="neutral"
                onChange={(item) => {
                  if (item && !selectedMedia.find(m => (m.id || m.localId) === (item.id || item.localId))) {
                    setSelectedMedia([...selectedMedia, item]);
                  }
                }}
                placeholder="Search to add movies or series..."
               />
             </div>

             {selectedMedia.length > 0 && (
               <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-black/20 border border-white/5">
                 {selectedMedia.map((item, i) => (
                   <div key={item.id || item.localId} className="relative group/item aspect-[2/3] w-16 rounded-lg overflow-hidden border border-white/10">
                      {item.posterPath ? (
                        <Image 
                          src={resolveImage(item.posterPath) || ""} 
                          alt={item.title} 
                          fill 
                          className="object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-[8px] text-zinc-500 text-center px-1">
                          {item.title}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedMedia(selectedMedia.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                   </div>
                 ))}
               </div>
             )}
          </div>

          <div className="flex flex-col gap-3">
             <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Privacy</label>
             <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                    isPublic 
                      ? "bg-purple-500/10 border-purple-500/50 text-white" 
                      : "bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10"
                  )}
                >
                  <Globe className={cn("w-5 h-5", isPublic ? "text-emerald-400" : "")} />
                  <div className="text-center">
                    <p className="text-sm font-bold">Public</p>
                    <p className="text-[10px] opacity-60">Visible to everyone</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                    !isPublic 
                      ? "bg-amber-500/10 border-amber-500/50 text-white" 
                      : "bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10"
                  )}
                >
                  <Lock className={cn("w-5 h-5", !isPublic ? "text-amber-400" : "")} />
                  <div className="text-center">
                    <p className="text-sm font-bold">Private</p>
                    <p className="text-[10px] opacity-60">Only visible to you</p>
                  </div>
                </button>
             </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="pt-4">
             <Button 
               type="submit" 
               disabled={isSubmitting || !name.trim()}
               className="w-full h-12 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold gap-2 shadow-xl shadow-white/5"
             >
               {isSubmitting ? (
                 <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
               ) : (
                 <>
                   <Save className="w-4 h-4" />
                   {initialData ? "Save Changes" : "Create List"}
                 </>
               )}
             </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
