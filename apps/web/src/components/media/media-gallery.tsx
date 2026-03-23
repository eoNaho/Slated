"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Play, X, ChevronLeft, ChevronRight, Image as ImageIcon, Film, Maximize2, ChevronDown, Sparkles, Check, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { cn, resolveImage } from "@/lib/utils";
import type { MediaGalleryData, MediaVideo, MediaImage } from "@/types";

type Tab = "videos" | "backdrops" | "posters";

interface MediaGalleryProps {
  mediaId: string;
}

export function MediaGallery({ mediaId }: MediaGalleryProps) {
  const [data, setData] = useState<MediaGalleryData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("videos");
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: MediaImage[]; index: number } | null>(null);
  const [activeVideo, setActiveVideo] = useState<MediaVideo | null>(null);
  const [activeCoverPath, setActiveCoverPath] = useState<string | null>(null);
  const [settingCover, setSettingCover] = useState<string | null>(null);

  const { data: session } = useSession();
  const isPremium = !!(session?.user as any)?.isPremium;

  // Limits per tab before "show more" appears
  const LIMITS: Record<Tab, number> = { videos: 6, backdrops: 8, posters: 14 };

  useEffect(() => {
    api.media.getGallery(mediaId)
      .then((res) => setData(res.data))
      .catch((e) => console.warn("Failed to load gallery", e));
  }, [mediaId]);

  // Fetch current custom cover path (to highlight the active poster)
  useEffect(() => {
    if (!session?.user) return;
    api.media.getState(mediaId)
      .then((res) => {
        const url = res.data.customCoverUrl;
        if (url?.includes("image.tmdb.org")) {
          const match = url.match(/\/t\/p\/[^/]+(\/.+)$/);
          if (match) setActiveCoverPath(match[1]);
        }
      })
      .catch(() => null);
  }, [mediaId, session?.user]);

  const handleSetCover = async (filePath: string) => {
    if (!session?.user) {
      toast.error("Faça login para usar esta função");
      return;
    }
    if (!isPremium) {
      toast.error("Esta função é exclusiva para assinantes Premium", {
        description: "Faça upgrade para Pro ou Ultra para usar covers da galeria.",
        action: { label: "Ver planos", onClick: () => window.location.href = "/premium" },
      });
      return;
    }
    setSettingCover(filePath);
    try {
      await api.media.setCustomCoverFromGallery(mediaId, filePath);
      setActiveCoverPath(filePath);
      toast.success("Cover atualizado!", { description: "O poster da galeria agora é seu cover personalizado." });
    } catch {
      toast.error("Falha ao definir cover");
    } finally {
      setSettingCover(null);
    }
  };

  const closeLightbox = useCallback(() => setLightbox(null), []);
  const closeVideo = useCallback(() => setActiveVideo(null), []);

  const lightboxNext = useCallback(() => {
    if (!lightbox) return;
    setLightbox({ ...lightbox, index: (lightbox.index + 1) % lightbox.images.length });
  }, [lightbox]);

  const lightboxPrev = useCallback(() => {
    if (!lightbox) return;
    setLightbox({ ...lightbox, index: (lightbox.index - 1 + lightbox.images.length) % lightbox.images.length });
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox && !activeVideo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeLightbox(); closeVideo(); }
      if (lightbox) {
        if (e.key === "ArrowRight") lightboxNext();
        if (e.key === "ArrowLeft") lightboxPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, activeVideo, closeLightbox, closeVideo, lightboxNext, lightboxPrev]);

  if (!data) return null;

  const { videos, backdrops, posters } = data;

  if (videos.length + backdrops.length + posters.length === 0) return null;

  const tabs = (
    [
      { id: "videos" as Tab,    label: "Videos",   count: videos.length,   icon: <Film className="w-3.5 h-3.5" /> },
      { id: "backdrops" as Tab, label: "Backdrops", count: backdrops.length, icon: <ImageIcon className="w-3.5 h-3.5" /> },
      { id: "posters" as Tab,   label: "Posters",  count: posters.length,  icon: <ImageIcon className="w-3.5 h-3.5" /> },
    ] as { id: Tab; label: string; count: number; icon: React.ReactNode }[]
  ).filter((t) => t.count > 0);

  const safeTab = tabs.find((t) => t.id === activeTab) ? activeTab : (tabs[0]?.id ?? "videos");

  const limit = LIMITS[safeTab];
  const visibleVideos   = expanded ? videos   : videos.slice(0, limit);
  const visibleBackdrops = expanded ? backdrops : backdrops.slice(0, limit);
  const visiblePosters  = expanded ? posters  : posters.slice(0, limit);
  const hasMore = (safeTab === "videos" && videos.length > limit)
    || (safeTab === "backdrops" && backdrops.length > limit)
    || (safeTab === "posters" && posters.length > limit);

  return (
    <section>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setExpanded(false); }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              safeTab === tab.id
                ? "bg-white/10 text-white border border-white/10"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            )}
          >
            {tab.icon}
            {tab.label}
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              safeTab === tab.id ? "bg-purple-500/20 text-purple-300" : "bg-white/5 text-zinc-600"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Videos grid */}
      {safeTab === "videos" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleVideos.map((video) => (
            <button
              key={video.key}
              onClick={() => setActiveVideo(video)}
              className="group relative aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/15 transition-all hover:-translate-y-0.5"
            >
              <Image
                fill
                src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
                alt={video.name}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-white/20 transition-all">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-xs font-semibold line-clamp-1">{video.name}</p>
                <p className="text-zinc-400 text-[10px] mt-0.5">{video.type}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Backdrops grid */}
      {safeTab === "backdrops" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleBackdrops.map((img) => (
            <button
              key={img.file_path}
              onClick={() => setLightbox({ images: backdrops, index: backdrops.indexOf(img) })}
              className="group relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/15 transition-all"
            >
              <Image
                fill
                src={resolveImage(img.file_path, "w500") || ""}
                alt=""
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Posters grid */}
      {safeTab === "posters" && (
        <>
          {session?.user && (
            <div className={cn(
              "flex items-center gap-2 mb-4 px-3 py-2 rounded-xl text-xs border",
              isPremium
                ? "bg-purple-500/10 border-purple-500/20 text-purple-300"
                : "bg-white/5 border-white/5 text-zinc-500"
            )}>
              {isPremium ? (
                <><Sparkles className="w-3.5 h-3.5 shrink-0" /> Clique em um poster para usá-lo como cover personalizado desta mídia.</>
              ) : (
                <><ImageOff className="w-3.5 h-3.5 shrink-0" /> Upgrade para <a href="/premium" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">Premium</a> para usar posters da galeria como cover personalizado.</>
              )}
            </div>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {visiblePosters.map((img) => {
              const isActive = activeCoverPath === img.file_path;
              const isLoading = settingCover === img.file_path;
              return (
                <div key={img.file_path} className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900">
                  {/* Active cover highlight */}
                  {isActive && (
                    <div className="absolute inset-0 ring-2 ring-purple-400 ring-inset rounded-lg z-10 pointer-events-none" />
                  )}
                  <button
                    onClick={() => setLightbox({ images: posters, index: posters.indexOf(img) })}
                    className={cn(
                      "absolute inset-0 border border-white/5 hover:border-white/15 transition-all rounded-lg",
                      isActive && "border-purple-500/50"
                    )}
                  >
                    <Image
                      fill
                      src={resolveImage(img.file_path, "w342") || ""}
                      alt=""
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  </button>

                  {/* Active badge */}
                  {isActive && (
                    <div className="absolute top-1.5 left-1.5 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500 text-white text-[9px] font-black uppercase tracking-wider">
                      <Check className="w-2.5 h-2.5" /> Cover
                    </div>
                  )}

                  {/* Expand + Set Cover buttons */}
                  <div className="absolute bottom-0 inset-x-0 p-1.5 flex flex-col gap-1 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); setLightbox({ images: posters, index: posters.indexOf(img) }); }}
                      className="w-full flex items-center justify-center gap-1 py-1 rounded-md bg-black/80 backdrop-blur-sm text-white text-[9px] font-bold hover:bg-black/90 transition-colors"
                    >
                      <Maximize2 className="w-2.5 h-2.5" /> Ver
                    </button>
                    {session?.user && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSetCover(img.file_path); }}
                        disabled={isLoading || isActive}
                        className={cn(
                          "w-full flex items-center justify-center gap-1 py-1 rounded-md text-[9px] font-bold transition-all",
                          isActive
                            ? "bg-purple-500/80 text-white cursor-default"
                            : isPremium
                            ? "bg-purple-600/80 hover:bg-purple-600 text-white backdrop-blur-sm"
                            : "bg-white/10 text-zinc-400 backdrop-blur-sm hover:bg-purple-500/20 hover:text-purple-300"
                        )}
                      >
                        {isLoading ? (
                          <div className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full animate-spin" />
                        ) : isActive ? (
                          <><Check className="w-2.5 h-2.5" /> Ativo</>
                        ) : (
                          <><Sparkles className="w-2.5 h-2.5" /> {isPremium ? "Usar como cover" : "Premium"}</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Show more / collapse */}
      {(hasMore || expanded) && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white text-sm font-semibold transition-all"
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
            {expanded ? "Show less" : `Show all ${safeTab === "videos" ? videos.length : safeTab === "backdrops" ? backdrops.length : posters.length}`}
          </button>
        </div>
      )}

      {/* Video lightbox */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={closeVideo}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={closeVideo}
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo.key}?autoplay=1&rel=0`}
              title={activeVideo.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
            <p className="text-white font-semibold text-sm">{activeVideo.name}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{activeVideo.type}</p>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            onClick={closeLightbox}
          >
            <X className="w-5 h-5" />
          </button>

          {lightbox.images.length > 1 && (
            <>
              <button
                className="absolute left-4 w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
                onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                className="absolute right-4 w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
                onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div
            className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center p-16"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const img = lightbox.images[lightbox.index];
              const isPortrait = (img.height ?? 0) > (img.width ?? 1);
              return (
                <div className={cn("relative rounded-xl overflow-hidden shadow-2xl", isPortrait ? "h-full max-w-sm mx-auto" : "w-full")}>
                  <Image
                    src={resolveImage(img.file_path, "original") || ""}
                    alt=""
                    width={img.width ?? 1920}
                    height={img.height ?? 1080}
                    className="object-contain max-h-[75vh] w-auto mx-auto"
                    style={{ maxWidth: "100%" }}
                  />
                </div>
              );
            })()}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-zinc-500 text-xs">
            {lightbox.index + 1} / {lightbox.images.length}
          </div>
        </div>
      )}
    </section>
  );
}
