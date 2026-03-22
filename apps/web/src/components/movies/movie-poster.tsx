"use client";

import Image from "next/image";
import { Film } from "lucide-react";
import { useMediaState } from "@/hooks/queries/use-media-state";

interface MoviePosterProps {
  movieId: string;
  title: string;
  defaultPosterPath?: string | null;
  sizes?: string;
}

export function MoviePoster({ movieId, title, defaultPosterPath, sizes }: MoviePosterProps) {
  const { data: mediaState } = useMediaState(movieId);
  const posterUrl = mediaState?.customCoverUrl || defaultPosterPath;

  if (!posterUrl) {
    return (
      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
        <Film className="h-16 w-16 text-zinc-800" />
      </div>
    );
  }

  return (
    <Image
      src={posterUrl}
      alt={title}
      fill
      unoptimized={posterUrl.endsWith(".gif")}
      className="object-cover"
      priority
      sizes={sizes ?? "(max-width: 1024px) 200px, 256px"}
    />
  );
}
