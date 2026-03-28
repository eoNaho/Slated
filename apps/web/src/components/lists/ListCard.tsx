"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { List as ListIcon, Lock, Globe, Bookmark } from "lucide-react";
import { cn, resolveImage } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface ListCardProps {
  list: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    itemsCount: number;
    isPublic: boolean;
    user: {
      username: string;
      avatarUrl?: string | null;
    };
  };
}

export function ListCard({ list }: ListCardProps) {
  const [bookmarked, setBookmarked] = useState(false);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const prev = bookmarked;
    setBookmarked(!prev);
    try {
      if (prev) await api.bookmarks.unbookmark("list", list.id);
      else await api.bookmarks.bookmark("list", list.id);
    } catch {
      setBookmarked(prev);
      toast.error("Failed to save list");
    }
  };

  return (
    <Link
      href={`/lists/${list.user.username}/${list.slug}`}
      className="group relative flex flex-col gap-4 p-5 rounded-2xl bg-zinc-900 border border-white/5 hover:border-white/10 transition-all hover:-translate-y-1"
    >
      {/* Bookmark button */}
      <button
        onClick={toggleBookmark}
        className={cn(
          "absolute top-3 right-3 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100",
          bookmarked
            ? "text-yellow-400 bg-yellow-400/10 opacity-100"
            : "text-zinc-500 hover:text-yellow-400 hover:bg-yellow-400/10"
        )}
        aria-label={bookmarked ? "Remove from saved" : "Save list"}
      >
        <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? "fill-current" : ""}`} />
      </button>
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
           <ListIcon className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-950 border border-white/5">
          {list.isPublic ? (
            <Globe className="w-3 h-3 text-emerald-500" />
          ) : (
            <Lock className="w-3 h-3 text-amber-500" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-tight text-white/60">
            {list.isPublic ? "Public" : "Private"}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-1">
          {list.name}
        </h3>
        <p className="text-zinc-500 text-sm line-clamp-2 min-h-[40px]">
          {list.description || "No description provided."}
        </p>
      </div>

      <div className="pt-4 mt-auto border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
           {list.user && (
             <>
               <div className="relative w-5 h-5 rounded-full bg-zinc-800 overflow-hidden ring-1 ring-white/10">
                  {list.user.avatarUrl ? (
                    <Image fill src={resolveImage(list.user.avatarUrl) || ""} alt={list.user.username} className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-500/20 text-[8px] font-black text-purple-400">
                       {list.user.username[0].toUpperCase()}
                    </div>
                  )}
               </div>
               <span className="text-xs font-medium text-zinc-400">@{list.user.username}</span>
             </>
           )}
        </div>
        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
           {list.itemsCount} {list.itemsCount === 1 ? 'item' : 'items'}
        </div>
      </div>
    </Link>
  );
}
