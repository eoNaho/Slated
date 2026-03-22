"use client";

import { useState, useEffect } from "react";
import { useWatchlist } from "@/hooks/queries/use-watchlist";
import { useSession } from "@/lib/auth-client";
import { Carousel } from "@/components/common";
import { MediaCard } from "@/components/media";

export function WatchlistRow() {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const { data, isLoading } = useWatchlist(mounted && !!session?.user);

  useEffect(() => setMounted(true), []);

  if (!mounted || !session?.user || isLoading) return null;

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <Carousel title="Próxima na sua lista" href="/watchlist">
      {items.map((item) => (
        <div key={item.id} className="snap-start flex-shrink-0">
          <MediaCard media={item.media} />
        </div>
      ))}
    </Carousel>
  );
}
