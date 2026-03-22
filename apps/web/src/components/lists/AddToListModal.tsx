"use client";

import * as React from "react";
import { X, List as ListIcon, Plus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { useUserLists } from "@/hooks/queries/use-lists";

interface AddToListModalProps {
  mediaId: string;
  mediaTitle: string;
  onClose: () => void;
}

export function AddToListModal({ mediaId, mediaTitle, onClose }: AddToListModalProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const [localLists, setLocalLists] = React.useState<any[] | null>(null);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const { data: listsData, isLoading } = useUserLists(user?.id, mediaId, !!user);

  // Keep a local copy so we can optimistically update toggle state
  React.useEffect(() => {
    if (listsData) setLocalLists(listsData);
  }, [listsData]);

  const lists = localLists ?? listsData ?? [];

  const handleToggleItem = async (listId: string, isInList: boolean) => {
    setIsProcessing(listId);
    try {
      if (isInList) {
        await api.lists.removeItem(listId, mediaId);
      } else {
        await api.lists.addItem(listId, mediaId);
      }
      
      // Update local state optimistically
      setLocalLists(prev => (prev ?? []).map(l =>
        l.id === listId
          ? { ...l, itemsCount: isInList ? l.itemsCount - 1 : l.itemsCount + 1, isInList: !isInList }
          : l
      ));
      
      // We'd ideally need a way to know if it's already in the list from the GET /lists call
      // But currently the API doesn't return that info in the list overview.
      // For now, let's assume the user knows or we show a success message.
    } catch (err: any) {
      setError(err.message || "Failed to update list");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
           <div className="flex flex-col gap-0.5">
             <h2 className="text-lg font-bold text-white">Add to List</h2>
             <p className="text-xs text-zinc-500 line-clamp-1">{mediaTitle}</p>
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

        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
               <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
               <p className="text-sm text-zinc-500">Loading your lists...</p>
            </div>
          ) : lists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
               <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-600">
                  <ListIcon className="w-6 h-6" />
               </div>
               <div className="space-y-1">
                 <p className="text-sm font-bold text-white">No lists yet</p>
                 <p className="text-xs text-zinc-500">Create your first list to organze your media.</p>
               </div>
            </div>
          ) : (
            lists.map((list) => (
              <button
                key={list.id}
                onClick={() => handleToggleItem(list.id, !!list.isInList)}
                disabled={!!isProcessing}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:text-purple-400 border border-white/5">
                     <ListIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{list.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-tight">{list.itemsCount} items</p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border transition-all",
                  list.isInList 
                   ? "bg-purple-500/20 border-purple-500/40 text-purple-400" 
                   : "bg-white/5 border-white/5 text-zinc-500"
                )}>
                   {isProcessing === list.id ? (
                      <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                   ) : list.isInList ? (
                      <Check className="w-4 h-4" />
                   ) : (
                      <Plus className="w-4 h-4" />
                   )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-white/5 bg-black/20">
           {error && <p className="text-red-500 text-xs font-medium text-center mb-4">{error}</p>}
           <Button 
            className="w-full h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold gap-2"
            onClick={onClose}
           >
              Done
           </Button>
        </div>
      </div>
    </div>
  );
}
