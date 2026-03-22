"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Play, X, ChevronLeft, ChevronRight, Image as ImageIcon, Film, Maximize2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type VideoItem = {
  key: string;
  name: string;
  type: string;
  site: string;
  official: boolean;
  published_at: string;
};

type ImageItem = {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
};

type GalleryData = {
  videos: VideoItem[];
  backdrops: ImageItem[];
  posters: ImageItem[];
};

type Tab = "videos" | "backdrops" | "posters";

interface MediaGalleryProps {
  tmdbId: number;
  type: "movie" | "series";
}

export function MediaGallery({ tmdbId, type }: MediaGalleryProps) {
  const [data, setData] = useState<GalleryData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("videos");
  const [lightbox, setLightbox] = useState<{ images: ImageItem[]; index: number } | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  useEffect(() => {
    api.media.getGallery(tmdbId, type)
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [tmdbId, type]);

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
  const totalVideos = videos.length;
  const totalBackdrops = backdrops.length;
  const totalPosters = posters.length;

  if (totalVideos + totalBackdrops + totalPosters === 0) return null;

  const tabs: { id: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: "videos", label: "Videos", count: totalVideos, icon: <Film className="w-3.5 h-3.5" /> },
    { id: "backdrops", label: "Backdrops", count: totalBackdrops, icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: "posters", label: "Posters", count: totalPosters, icon: <ImageIcon className="w-3.5 h-3.5" /> },
  ].filter((t) => t.count > 0);

  // Ensure active tab exists
  const safeTab = tabs.find((t) => t.id === activeTab) ? activeTab : tabs[0]?.id ?? "videos";

  return (
    <section>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
          {videos.map((video) => (
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
          {backdrops.map((img, i) => (
            <button
              key={img.file_path}
              onClick={() => setLightbox({ images: backdrops, index: i })}
              className="group relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/15 transition-all"
            >
              <Image
                fill
                src={`https://image.tmdb.org/t/p/w500${img.file_path}`}
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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {posters.map((img, i) => (
            <button
              key={img.file_path}
              onClick={() => setLightbox({ images: posters, index: i })}
              className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/15 transition-all"
            >
              <Image
                fill
                src={`https://image.tmdb.org/t/p/w342${img.file_path}`}
                alt=""
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
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
              const isPortrait = img.height > img.width;
              return (
                <div className={cn("relative rounded-xl overflow-hidden shadow-2xl", isPortrait ? "h-full max-w-sm mx-auto" : "w-full")}>
                  <Image
                    src={`https://image.tmdb.org/t/p/original${img.file_path}`}
                    alt=""
                    width={img.width}
                    height={img.height}
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
