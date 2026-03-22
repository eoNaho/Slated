"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { MediaGrid } from "@/components/common/media-grid";
import { DiscoverFilters } from "@/components/discover/discover-filters";
import type { SearchResult } from "@/types";
import { Button } from "@/components/ui/button";
import { ChevronRight, LayoutGrid, Sparkles, Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AddToListModal } from "@/components/lists/AddToListModal";
import { useDiscoverMeta, useDiscoverResults } from "@/hooks/queries/use-discover";

export default function DiscoverPage() {
  const [items, setItems] = React.useState<SearchResult[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [filters, setFilters] = React.useState({
    type: "all",
    genre: "",
    year: "",
    sortBy: "popularity",
    streaming: ""
  });
  const [isRoulette, setIsRoulette] = React.useState(false);
  const [rouletteCount, setRouletteCount] = React.useState(1);
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [isRouletteLoading, setIsRouletteLoading] = React.useState(false);
  const [listMedia, setListMedia] = React.useState<SearchResult | null>(null);

  // Static metadata (genres, streaming services)
  const { data: metaData } = useDiscoverMeta();
  const genres = metaData?.genres ?? [];
  const streamingServices = metaData?.streamingServices ?? [];

  // Normalised filters for the query hook (page=1 only; load-more uses direct API call)
  const queryFilters = React.useMemo(() => ({
    page: 1,
    type: filters.type === "all" ? undefined : filters.type,
    genre: filters.genre || undefined,
    year: filters.year ? Number(filters.year) : undefined,
    sortBy: filters.sortBy,
    streaming: filters.streaming || undefined,
  }), [filters]);

  const { data: resultsData, isLoading: resultsLoading } = useDiscoverResults(queryFilters, !isRoulette);
  const isLoading = resultsLoading && !isRoulette;

  // Sync query results → local items state (filter changes reset to page 1)
  React.useEffect(() => {
    if (resultsData && !isRoulette) {
      setItems(resultsData.data);
      setTotalPages(resultsData.totalPages);
      setPage(1);
    }
  }, [resultsData, isRoulette]);

  // Load-more helper (appends pages via direct API call)
  const loadResults = React.useCallback(async (pageNum: number, currentFilters: typeof filters, append = false) => {
    if (isRoulette) return;
    try {
      const res = await api.discover.get({
        page: pageNum,
        type: currentFilters.type === "all" ? undefined : currentFilters.type,
        genre: currentFilters.genre || undefined,
        year: currentFilters.year ? Number(currentFilters.year) : undefined,
        sortBy: currentFilters.sortBy,
        streaming: currentFilters.streaming || undefined,
      });

      if (append) {
        setItems(prev => [...prev, ...res.data]);
      } else {
        setItems(res.data);
      }
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error("Failed to discover media", e);
    }
  }, [isRoulette]);

  const handleSpin = async () => {
    setIsSpinning(true);
    setIsRouletteLoading(true);
    try {
      // Small artificial delay for "spinning" feel
      await new Promise(r => setTimeout(r, 800));
      const res = await api.discover.random({
        limit: rouletteCount,
        type: filters.type === "all" ? undefined : filters.type,
        genre: filters.genre || undefined,
        year: filters.year ? Number(filters.year) : undefined,
        streaming: filters.streaming || undefined,
      });
      setItems(res.data);
      setTotalPages(1); // Roulette results are a single set
    } catch (e) {
      console.error("Failed to spin roulette", e);
    } finally {
      setIsSpinning(false);
      setIsRouletteLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadResults(nextPage, filters, true);
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Hero Header */}
      <div className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-purple-900/20 via-black to-black pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-widest">
                <Sparkles className="w-3" />
                Explore the library
              </div>
              <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {isRoulette ? "Discover " : "Discover your next "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
                  {isRoulette ? "Roulette." : "obsession."}
                </span>
              </h1>
              <p className="text-zinc-400 text-base max-w-xl">
                {isRoulette 
                  ? "Feeling indecisive? Let the roulette choose something special for you based on your vibes." 
                  : "Browse thousands of movies and TV shows from the PixelReel database with advanced filters."}
              </p>
            </div>

            <div className="flex p-1 bg-zinc-900/50 rounded-xl border border-white/5 backdrop-blur-md self-start md:self-auto">
              {[
                { id: false, label: "Browse", icon: LayoutGrid },
                { id: true, label: "Roulette", icon: Dices },
              ].map((m) => (
                <button
                  key={String(m.id)}
                  onClick={() => setIsRoulette(m.id as boolean)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all",
                    isRoulette === m.id 
                      ? "bg-white text-black shadow-lg" 
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <m.icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 space-y-12">
        {/* Filters Section */}
        <section className={cn(
          "sticky top-20 z-40 bg-black/60 backdrop-blur-xl -mx-6 px-6 py-4 border-y border-white/5 transition-all",
          isSpinning && "opacity-50 pointer-events-none scale-[0.98]"
        )}>
           <DiscoverFilters 
             genres={genres} 
             streamingServices={streamingServices}
             filters={filters}
             onChange={setFilters}
           />
           
           {isRoulette && (
             <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               className="mt-6 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6"
             >
               <div className="flex items-center gap-4">
                 <div className="space-y-1">
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">How many results?</p>
                   <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-white/5">
                      {[1, 3, 5, 10].map(n => (
                        <button
                          key={n}
                          onClick={() => setRouletteCount(n)}
                          className={cn(
                            "w-10 h-10 rounded-lg text-xs font-bold transition-all",
                            rouletteCount === n ? "bg-purple-500 text-white shadow-lg" : "text-zinc-500 hover:text-white"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                   </div>
                 </div>
               </div>

               <Button 
                onClick={handleSpin}
                disabled={isSpinning}
                className={cn(
                  "h-14 px-10 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:brightness-110 text-white border-0 shadow-xl shadow-purple-500/10 text-base font-bold tracking-normal gap-2 group transition-all",
                  isSpinning ? "scale-95 brightness-75" : "hover:scale-[1.02] active:scale-95"
                )}
               >
                 {isSpinning ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <span className="animate-pulse">Spinning...</span>
                    </div>
                 ) : (
                   <>
                    <Dices className="w-5 h-5" />
                    <span>SPIN THE WHEEL</span>
                   </>
                 )}
               </Button>
             </motion.div>
           )}
        </section>

        {/* Results Grid */}
        <section className={cn(
          "space-y-8 transition-all duration-700",
          isSpinning && "blur-xl opacity-20 scale-95"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-500">
               <LayoutGrid className="w-4 h-4" />
               <span className="text-sm font-medium">
                 {isRoulette ? "Your random picks" : `Showing ${items.length} titles`}
               </span>
            </div>
          </div>

          <MediaGrid 
            items={items} 
            isLoading={isLoading && page === 1 && !isRoulette} 
            onAddToList={(item) => setListMedia(item)}
          />

          {/* Load More */}
          {!isRoulette && page < totalPages && (
            <div className="flex justify-center pt-8">
              <Button 
                onClick={handleLoadMore}
                disabled={isLoading}
                variant="outline"
                className="h-14 px-8 rounded-2xl border-white/10 hover:bg-white/5 text-white gap-2 transition-all active:scale-95"
              >
                {isLoading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  <>
                    <span>Load More Results</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {listMedia && (
          <AddToListModal 
            mediaId={listMedia.localId ?? String(listMedia.id)}
            mediaTitle={listMedia.title}
            onClose={() => setListMedia(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
