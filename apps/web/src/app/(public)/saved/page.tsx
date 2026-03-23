"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark, Film, FileText, List as ListIcon, X,
  Star, Globe, Lock, ExternalLink, Loader2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import Image from "next/image";
import { cn, resolveImage } from "@/lib/utils";

type FilterType = "all" | "media" | "review" | "list";

interface EnrichedBookmark {
  id: string;
  targetType: "media" | "review" | "list";
  targetId: string;
  note: string | null;
  createdAt: string;
  target?: {
    // media
    title?: string;
    posterPath?: string | null;
    slug?: string;
    type?: string;
    releaseDate?: string | null;
    // review
    content?: string;
    rating?: number | null;
    mediaTitle?: string | null;
    mediaPoster?: string | null;
    mediaSlug?: string | null;
    authorUsername?: string | null;
    // list
    name?: string;
    description?: string | null;
    itemsCount?: number;
    ownerUsername?: string | null;
  };
}

const FILTER_TABS: { value: FilterType; label: string; icon: typeof Film }[] = [
  { value: "all", label: "Todos", icon: Bookmark },
  { value: "media", label: "Filmes & Séries", icon: Film },
  { value: "review", label: "Reviews", icon: FileText },
  { value: "list", label: "Listas", icon: ListIcon },
];

function MediaCard({ bookmark, onRemove }: { bookmark: EnrichedBookmark; onRemove: () => void }) {
  const t = bookmark.target;
  const year = t?.releaseDate ? new Date(t.releaseDate).getFullYear() : null;
  const href = t?.slug ? `/${t.type === "movie" ? "movies" : "series"}/${t.slug}` : "#";
  return (
    <div className="group relative">
      <Link href={href} className="block">
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/15 transition-all">
          {t?.posterPath ? (
            <Image
              fill
              src={resolveImage(t.posterPath) || ""}
              alt={t.title || ""}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-8 h-8 text-zinc-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
            <p className="text-white text-xs font-bold leading-tight line-clamp-2">{t?.title}</p>
            {year && <p className="text-zinc-400 text-[10px] mt-0.5">{year}</p>}
          </div>
          <div className={cn(
            "absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
            t?.type === "movie" ? "bg-purple-600/90 text-white" : "bg-pink-600/90 text-white"
          )}>
            {t?.type === "movie" ? "Filme" : "Série"}
          </div>
        </div>
      </Link>
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-zinc-400 hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
        aria-label="Remover dos salvos"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function ReviewCard({ bookmark, onRemove }: { bookmark: EnrichedBookmark; onRemove: () => void }) {
  const t = bookmark.target;
  return (
    <div className="group relative bg-zinc-900/60 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all hover:bg-zinc-900">
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Remover dos salvos"
      >
        <X className="w-3 h-3" />
      </button>
      <div className="flex gap-3">
        {t?.mediaPoster && (
          <div className="relative shrink-0 w-12 h-[72px] rounded-lg overflow-hidden bg-zinc-800">
            <Image fill src={resolveImage(t.mediaPoster) || ""} alt={t.mediaTitle || ""} className="object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white line-clamp-1">{t?.mediaTitle || "Sem título"}</p>
          {t?.authorUsername && (
            <p className="text-[10px] text-zinc-500 mt-0.5">por @{t.authorUsername}</p>
          )}
          {t?.rating != null && (
            <div className="flex items-center gap-0.5 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={cn("w-2.5 h-2.5", i < (t.rating ?? 0) ? "fill-green-400 text-green-400" : "fill-zinc-700 text-zinc-700")} />
              ))}
            </div>
          )}
        </div>
      </div>
      {t?.content && (
        <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3 mt-3 pt-3 border-t border-white/5">
          "{t.content}"
        </p>
      )}
      <p className="text-[10px] text-zinc-600 mt-2">
        {formatDistanceToNow(new Date(bookmark.createdAt), { addSuffix: true, locale: ptBR })}
      </p>
    </div>
  );
}

function ListCard({ bookmark, onRemove }: { bookmark: EnrichedBookmark; onRemove: () => void }) {
  const t = bookmark.target;
  const href = t?.ownerUsername && t?.slug ? `/lists/${t.ownerUsername}/${t.slug}` : "#";
  return (
    <div className="group relative bg-zinc-900/60 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all hover:bg-zinc-900">
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Remover dos salvos"
      >
        <X className="w-3 h-3" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 shrink-0">
          <ListIcon className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white line-clamp-1">{t?.name || "Lista"}</p>
          {t?.ownerUsername && (
            <p className="text-[10px] text-zinc-500 mt-0.5">@{t.ownerUsername}</p>
          )}
        </div>
      </div>
      {t?.description && (
        <p className="text-zinc-500 text-xs line-clamp-2 mt-2">{t.description}</p>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-wider">
          {t?.itemsCount ?? 0} {t?.itemsCount === 1 ? "item" : "itens"}
        </span>
        <Link href={href} className="flex items-center gap-1 text-[10px] font-semibold text-purple-400 hover:text-purple-300 transition-colors">
          Ver lista <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

export default function SavedPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["bookmarks", filter],
    queryFn: () =>
      api.bookmarks.list({
        targetType: filter === "all" ? undefined : filter,
        limit: 50,
      }),
  });

  const unbookmarkMutation = useMutation({
    mutationFn: ({ targetType, targetId }: { targetType: "media" | "review" | "list"; targetId: string }) =>
      api.bookmarks.unbookmark(targetType, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Removido dos salvos");
    },
    onError: () => toast.error("Falha ao remover"),
  });

  const bookmarks = (data?.data ?? []) as EnrichedBookmark[];
  const mediaBookmarks = bookmarks.filter((b) => b.targetType === "media");
  const reviewBookmarks = bookmarks.filter((b) => b.targetType === "review");
  const listBookmarks = bookmarks.filter((b) => b.targetType === "list");

  const handleRemove = (b: EnrichedBookmark) =>
    unbookmarkMutation.mutate({ targetType: b.targetType, targetId: b.targetId });

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Hero */}
      <div className="relative pt-32 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-900/10 via-black to-black pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-widest mb-4">
            <Bookmark className="w-3 h-3" />
            Salvos
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Sua coleção{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
              pessoal.
            </span>
          </h1>
          <p className="text-zinc-400 mt-2 text-base">
            Filmes, reviews e listas que você guardou para depois.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-10 flex-wrap">
          {FILTER_TABS.map((f) => {
            const count = f.value === "all" ? bookmarks.length
              : f.value === "media" ? mediaBookmarks.length
              : f.value === "review" ? reviewBookmarks.length
              : listBookmarks.length;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                  filter === f.value
                    ? "bg-yellow-500/15 border border-yellow-500/30 text-yellow-400"
                    : "bg-zinc-900 border border-white/5 text-zinc-500 hover:text-white hover:border-white/10"
                )}
              >
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
                {!isLoading && (
                  <span className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded-md",
                    filter === f.value ? "bg-yellow-500/20 text-yellow-400" : "bg-white/5 text-zinc-600"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="p-5 rounded-2xl bg-zinc-900 border border-white/5">
              <Bookmark className="w-10 h-10 text-zinc-700" />
            </div>
            <div className="text-center">
              <p className="text-zinc-300 font-semibold text-lg">Nenhum item salvo</p>
              <p className="text-zinc-600 text-sm mt-1">
                Salve filmes, reviews e listas tocando no{" "}
                <Bookmark className="w-3 h-3 inline text-yellow-400" /> em qualquer conteúdo.
              </p>
            </div>
            <Link
              href="/discover"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:brightness-110 text-white text-sm font-bold transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Explorar conteúdo
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Media grid */}
            {(filter === "all" || filter === "media") && mediaBookmarks.length > 0 && (
              <section>
                {filter === "all" && (
                  <div className="flex items-center gap-2 mb-5">
                    <Film className="w-4 h-4 text-purple-400" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">
                      Filmes & Séries
                    </h2>
                    <span className="text-[10px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
                      {mediaBookmarks.length}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {mediaBookmarks.map((b) => (
                    <MediaCard key={b.id} bookmark={b} onRemove={() => handleRemove(b)} />
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            {(filter === "all" || filter === "review") && reviewBookmarks.length > 0 && (
              <section>
                {filter === "all" && (
                  <div className="flex items-center gap-2 mb-5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">
                      Reviews
                    </h2>
                    <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                      {reviewBookmarks.length}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reviewBookmarks.map((b) => (
                    <ReviewCard key={b.id} bookmark={b} onRemove={() => handleRemove(b)} />
                  ))}
                </div>
              </section>
            )}

            {/* Lists */}
            {(filter === "all" || filter === "list") && listBookmarks.length > 0 && (
              <section>
                {filter === "all" && (
                  <div className="flex items-center gap-2 mb-5">
                    <ListIcon className="w-4 h-4 text-green-400" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">
                      Listas
                    </h2>
                    <span className="text-[10px] font-black bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                      {listBookmarks.length}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listBookmarks.map((b) => (
                    <ListCard key={b.id} bookmark={b} onRemove={() => handleRemove(b)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
