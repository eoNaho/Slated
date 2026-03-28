"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  List as ListIcon,
  Globe,
  Lock,
  Calendar,
  Trash2,
  Edit2,
  Share2,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import { MediaGrid } from "@/components/common/media-grid";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { CreateListModal } from "@/components/lists/CreateListModal";
import Link from "next/link";
import { resolveImage } from "@/lib/utils";
import { MediaSearchInput } from "@/components/media/media-search-input";
import { toast } from "sonner";
import { ListDetails, SearchResult } from "@/types";
import Image from "next/image";
import { useCustomCovers } from "@/hooks/queries/use-custom-covers";

export default function ListDetailPageBySlug() {
  const { username, slug } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [list, setList] = React.useState<ListDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const loadList = React.useCallback(async () => {
    try {
      const res = await api.lists.getBySlug(username as string, slug as string);
      setList(res.data);
    } catch (err) {
      console.error("Failed to load list", err);
    } finally {
      setIsLoading(false);
    }
  }, [username, slug]);

  const handleAddMedia = async (
    mediaItem: Pick<
      SearchResult,
      "id" | "title" | "posterPath" | "mediaType" | "localId" | "localSlug"
    > | null,
  ) => {
    if (!mediaItem || !list) return;
    try {
      await api.lists.addItem(
        list.id,
        mediaItem.localId ?? String(mediaItem.id),
      );
      toast.success(`${mediaItem.title} added to list`);
      loadList();
    } catch (err) {
      toast.error((err as Error).message || "Failed to add media");
    }
  };

  React.useEffect(() => {
    loadList();
  }, [loadList]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this list?")) return;
    setIsDeleting(true);
    try {
      await api.lists.delete(list!.id);
      router.push(`/profile/${session?.user.username}?tab=lists`);
    } catch (err) {
      console.error("Failed to delete list", err);
      setIsDeleting(false);
    }
  };

  const handleRemoveItem = async (media: { id: string; title: string }) => {
    if (!confirm(`Remove "${media.title}" from this list?`)) return;
    try {
      await api.lists.removeItem(list!.id, media.id);
      loadList();
    } catch (err) {
      console.error("Failed to remove item", err);
    }
  };

  const isOwner = session?.user?.id === list?.userId;
  const { data: customCovers = {} } = useCustomCovers(list?.user?.username);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-700">
          <ListIcon className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            List not found
          </h1>
          <p className="text-zinc-500">
            The list you're looking for doesn't exist or is private.
          </p>
        </div>
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="text-zinc-400"
        >
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Header */}
      <div className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-zinc-950/50 to-zinc-950 -z-10" />

        <div className="container mx-auto px-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 text-sm font-bold group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            BACK
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="px-2.5 py-1 rounded-md bg-zinc-900/50 border border-white/5 backdrop-blur-md flex items-center gap-1.5">
                  {list.isPublic ? (
                    <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                    {list.isPublic ? "Public" : "Private"}
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {new Date(list.createdAt).getFullYear()}
                  </span>
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight">
                {list.name}
              </h1>

              {list.description && (
                <p className="text-zinc-400 text-lg leading-relaxed">
                  {list.description}
                </p>
              )}

              <div className="flex items-center gap-6 pt-4">
                <Link
                  href={`/profile/${list.user?.username}`}
                  className="flex items-center gap-2 group"
                >
                  {/* ADICIONADO 'relative' AQUI NA DIV DO AVATAR */}
                  <div className="relative w-8 h-8 rounded-full bg-zinc-800 overflow-hidden ring-2 ring-white/5">
                    {list.user?.avatarUrl ? (
                      <Image
                        fill
                        src={resolveImage(list.user?.avatarUrl ?? null) || ""}
                        alt={list.user?.username ?? ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-500/20 text-xs font-black text-purple-400">
                        {list.user?.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-black uppercase tracking-tight">
                      Curated by
                    </span>
                    <span className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                      @{list.user?.username}
                    </span>
                  </div>
                </Link>

                <div className="h-8 w-px bg-white/5" />

                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-tight">
                    Collection
                  </span>
                  <span className="text-sm font-bold text-white">
                    {list.itemsCount} Items
                  </span>
                </div>
              </div>

              {/* Adicionar Media (Apenas para o Dono) */}
              {isOwner && (
                <div className="pt-8 max-w-lg">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                      Add to this list
                    </label>
                    <MediaSearchInput
                      placeholder="Search for movies or series..."
                      onChange={handleAddMedia}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isOwner ? (
                <>
                  <Button
                    onClick={() => setShowEditModal(true)}
                    className="h-12 px-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="h-12 px-6 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 font-bold gap-2"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete
                  </Button>
                </>
              ) : (
                <Button className="h-12 px-6 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold gap-2">
                  <Share2 className="w-4 h-4" />
                  Share List
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="container mx-auto px-6 pt-12">
        <MediaGrid
          items={list.items.map((i) => ({ ...i.media, id: i.mediaId }))}
          customCovers={customCovers}
          onRemove={isOwner ? handleRemoveItem : undefined}
        />

        {list.items.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-4 bg-zinc-900/30 rounded-3xl border border-dashed border-white/5">
            <LayoutGrid className="w-12 h-12 text-zinc-700" />
            <div className="space-y-1">
              <p className="text-lg font-bold text-white/40">
                This list is empty
              </p>
              <p className="text-sm text-zinc-600">
                Start exploring to add some media here.
              </p>
            </div>
            <Link href="/discover">
              <Button className="mt-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold h-11 px-8">
                Discover
              </Button>
            </Link>
          </div>
        )}
      </div>

      {showEditModal && (
        <CreateListModal
          initialData={
            list
              ? {
                  id: list.id,
                  name: list.name,
                  description: list.description ?? null,
                  isPublic: list.isPublic,
                }
              : undefined
          }
          onClose={() => setShowEditModal(false)}
          onSuccess={loadList}
        />
      )}
    </div>
  );
}

function LayoutGrid(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}
