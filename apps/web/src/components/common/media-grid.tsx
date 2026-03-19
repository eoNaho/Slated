import Link from "next/link";
import { Star, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { cn, getMediaUrl, resolveImage } from "@/lib/utils";
import { SearchResult } from "@/types";

interface MediaGridProps {
  items: any[];
  isLoading?: boolean;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  renderOverlay?: (item: any) => React.ReactNode;
  onAddToList?: (item: any) => void;
  onRemove?: (item: any) => void;
}

export function MediaGrid({ items, isLoading, columns = {}, renderOverlay, onAddToList, onRemove }: MediaGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="aspect-[2/3] rounded-xl bg-zinc-900 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-600">
           <LayoutGrid className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white">No results found</h3>
        <p className="text-zinc-500 text-sm">Try adjusting your filters.</p>
      </div>
    );
  }

  const gridCols = cn(
    "grid gap-4 sm:gap-6",
    columns.default ? `grid-cols-${columns.default}` : "grid-cols-2",
    columns.sm ? `sm:grid-cols-${columns.sm}` : "sm:grid-cols-3",
    columns.md ? `md:grid-cols-${columns.md}` : "md:grid-cols-4",
    columns.lg ? `lg:grid-cols-${columns.lg}` : "lg:grid-cols-5",
    columns.xl ? `xl:grid-cols-${columns.xl}` : "xl:grid-cols-6"
  );

  return (
    <div className={gridCols}>
      {items.map((item) => (
        <MediaCard 
          key={item.id} 
          item={item} 
          renderOverlay={renderOverlay} 
          onAddToList={onAddToList}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function MediaCard({ 
  item, 
  renderOverlay,
  onAddToList,
  onRemove
}: { 
  item: any; 
  renderOverlay?: (item: any) => React.ReactNode;
  onAddToList?: (item: any) => void;
  onRemove?: (item: any) => void;
}) {
  const mediaType = item.type || item.mediaType || "movie";
  const url = getMediaUrl({ ...item, type: mediaType });
  const poster = resolveImage(item.posterPath);

  return (
    <Link 
      href={url}
      className="group relative flex flex-col gap-2 transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 ring-1 ring-white/5 shadow-2xl">
        {poster ? (
          <img 
            src={poster} 
            alt={item.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 uppercase font-black text-[10px] px-2 text-center">
            {item.title}
          </div>
        )}
        
        {/* Rating Badge */}
        {item.voteAverage > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1 z-10">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-[10px] font-bold text-white">{item.voteAverage.toFixed(1)}</span>
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1 min-w-0">
              {renderOverlay ? renderOverlay(item) : (
                 <>
                   <span className="text-white text-xs font-bold line-clamp-2">{item.title}</span>
                   <span className="text-white/60 text-[10px] font-medium mt-0.5 block">
                     {item.releaseDate ? new Date(item.releaseDate).getFullYear() : 'N/A'}
                   </span>
                 </>
              )}
            </div>

            {onAddToList && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddToList(item);
                }}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 shadow-lg backdrop-blur-md"
                title="Add to List"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            {onRemove && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(item);
                }}
                className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/40 border border-red-500/20 flex items-center justify-center text-red-500 transition-all hover:scale-110 active:scale-95 shadow-lg backdrop-blur-md"
                title="Remove from List"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
