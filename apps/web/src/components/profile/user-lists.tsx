import Link from "next/link";
import { List, Heart, ChevronRight } from "lucide-react";
import type { List as ListType } from "@/types";

type ListVariant =
  | "lg01"      // Large horizontal (5 slots)
  | "md01"      // Medium horizontal with title on right (5 slots)
  | "md02"      // Medium horizontal with title on right (5 slots)
  | "xlg"       // Extra large horizontal (8+ slots)
  | "sm"        // Small horizontal (4 slots)
  | "xsm"       // Extra small horizontal (4 slots)
  | "card"      // Card grid view (4 slots)
  | "lg02"      // Large card (5 slots)
  | "thumbnail-lg"    // Large thumbnail
  | "thumbnail-md"    // Medium thumbnail  
  | "thumbnail-sm"    // Small thumbnail
  | "thumbnail-xlg"   // Extra large thumbnail (5 slots, larger size)
  | "thumbnail-wide"; // Wide thumbnail (horizontal, 5 slots)

interface UserListsProps {
  lists: ListType[];
  limit?: number;
  showViewAll?: boolean;
  variant?: ListVariant;
  gridLayout?: boolean; // Enable grid layout for multiple lists
}

interface ListItemProps {
  list: ListType;
  variant: ListVariant;
}

function ListItem({ list, variant }: ListItemProps) {
  const images = list.coverImages || [];

  // Variant configurations
  const config = {
    "lg01": { 
      slots: 5, 
      height: "aspect-[10/3]", 
      titlePosition: "bottom", 
      showDescription: true, 
      gridCols: "grid-cols-5", 
      width: "w-full" 
    },
    "md01": { 
      slots: 5, 
      height: "h-24 sm:h-28", 
      titlePosition: "right", 
      showDescription: true, 
      gridCols: "grid-cols-5", 
      width: "w-48 sm:w-56" 
    },
    "md02": { 
      slots: 5, 
      height: "h-24 sm:h-28", 
      titlePosition: "right", 
      showDescription: true, 
      gridCols: "grid-cols-5", 
      width: "w-48 sm:w-56" 
    },
    "xlg": { 
      slots: 8, 
      height: "aspect-[16/3]", 
      titlePosition: "bottom", 
      showDescription: false, 
      gridCols: "grid-cols-8", 
      width: "w-full" 
    },
    "sm": { 
      slots: 4, 
      height: "aspect-[8/3]", 
      titlePosition: "bottom", 
      showDescription: false, 
      gridCols: "grid-cols-4", 
      width: "w-full" 
    },
    "xsm": { 
      slots: 4, 
      height: "aspect-[8/3]", 
      titlePosition: "bottom", 
      showDescription: false, 
      gridCols: "grid-cols-4", 
      width: "w-full" 
    },
    "card": { 
      slots: 4, 
      height: "aspect-[8/3]", 
      titlePosition: "bottom", 
      showDescription: false, 
      gridCols: "grid-cols-4", 
      width: "w-full" 
    },
    "lg02": { 
      slots: 5, 
      height: "aspect-[10/3]", 
      titlePosition: "bottom", 
      showDescription: false, 
      gridCols: "grid-cols-5", 
      width: "w-full" 
    },
    "thumbnail-lg": { 
      slots: 5, 
      height: "aspect-[10/3]", 
      titlePosition: "overlay", 
      showDescription: false, 
      gridCols: "grid-cols-5", 
      width: "w-full" 
    },
    "thumbnail-md": { 
      slots: 4, 
      height: "aspect-[8/3]", 
      titlePosition: "overlay", 
      showDescription: false, 
      gridCols: "grid-cols-4", 
      width: "w-full" 
    },
    "thumbnail-sm": { 
      slots: 4, 
      height: "aspect-[8/3]", 
      titlePosition: "overlay", 
      showDescription: false, 
      gridCols: "grid-cols-4", 
      width: "w-full" 
    },
    "thumbnail-xlg": { 
      slots: 5, 
      height: "aspect-[5/3]", 
      titlePosition: "overlay", 
      showDescription: false, 
      gridCols: "grid-cols-5", 
      width: "w-full" 
    },
    "thumbnail-wide": { 
      slots: 5, 
      height: "h-32 sm:h-36", 
      titlePosition: "overlay", 
      showDescription: false, 
      gridCols: "grid-cols-5", 
      width: "w-full" 
    },
  };

  const { slots, height, titlePosition, showDescription, gridCols, width } = config[variant];
  const slotArray = Array(slots).fill(null);

  // Horizontal layouts (title on right)
  if (titlePosition === "right") {
    return (
      <Link href={`/lists/${list.id}`} className="group block">
        <div className="flex gap-4 items-start">
          {/* Poster Strip */}
          <div className={`${height} ${width} grid ${gridCols} gap-0.5 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 flex-shrink-0`}>
            {slotArray.map((_, i) => {
              const image = images[i];
              return (
                <div key={i} className="relative w-full h-full bg-zinc-800/50">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/[0.02]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>

          {/* Metadata */}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-base truncate group-hover:text-purple-400 transition-colors">
              {list.name}
            </h4>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {list.user && (
                <div className="flex items-center gap-1.5">
                  {list.user.avatarUrl ? (
                    <img src={list.user.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-zinc-800" />
                  )}
                  <span className="text-xs text-zinc-400 font-medium hover:text-zinc-200 transition-colors">
                    {list.user.username}
                  </span>
                </div>
              )}

              <span className="text-xs text-zinc-500">
                {list.itemsCount} items
              </span>

              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Heart className="h-3 w-3" /> {list.likesCount}
              </span>
            </div>

            {showDescription && list.description && (
              <p className="text-xs text-zinc-500 line-clamp-2 mt-2">
                {list.description}
              </p>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Thumbnail layouts (title overlay)
  if (titlePosition === "overlay") {
    return (
      <Link href={`/lists/${list.id}`} className="group block">
        <div className="relative rounded-lg overflow-hidden border border-white/5">
          <div className={`${height} ${width} grid ${gridCols} gap-0.5 bg-zinc-900`}>
            {slotArray.map((_, i) => {
              const image = images[i];
              return (
                <div key={i} className="relative w-full h-full bg-zinc-800/50">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/[0.02]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Overlay gradient and title */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h4 className="font-bold text-white text-sm truncate group-hover:text-purple-400 transition-colors">
              {list.name}
            </h4>

            <div className="flex items-center gap-2 mt-1">
              {list.user && (
                <div className="flex items-center gap-1.5">
                  {list.user.avatarUrl ? (
                    <img src={list.user.avatarUrl} alt="" className="w-3.5 h-3.5 rounded-full" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-zinc-800" />
                  )}
                  <span className="text-xs text-zinc-300 font-medium">
                    {list.user.username}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Default vertical layouts (title on bottom)
  return (
    <Link href={`/lists/${list.id}`} className="group block">
      {/* Poster Strip */}
      <div className={`${height} ${width} grid ${gridCols} gap-0.5 rounded-lg overflow-hidden bg-zinc-900 border border-white/5`}>
        {slotArray.map((_, i) => {
          const image = images[i];
          return (
            <div key={i} className="relative w-full h-full bg-zinc-800/50">
              {image ? (
                <img
                  src={image}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-white/[0.02]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}
      </div>

      {/* Metadata */}
      <div className="mt-3">
        <h4 className="font-bold text-white text-base truncate group-hover:text-purple-400 transition-colors">
          {list.name}
        </h4>

        <div className="flex items-center gap-3 mt-1.5">
          {list.user && (
            <div className="flex items-center gap-1.5">
              {list.user.avatarUrl ? (
                <img src={list.user.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-zinc-800" />
              )}
              <span className="text-xs text-zinc-400 font-medium hover:text-zinc-200 transition-colors">
                {list.user.username}
              </span>
            </div>
          )}

          <span className="text-xs text-zinc-500">
            {list.itemsCount} items
          </span>

          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Heart className="h-3 w-3" /> {list.likesCount}
          </span>
        </div>

        {showDescription && list.description && (
          <p className="text-xs text-zinc-500 line-clamp-1 mt-1 pr-4">
            {list.description}
          </p>
        )}
      </div>
    </Link>
  );
}

export function UserLists({
  lists,
  limit,
  showViewAll = true,
  variant = "lg01",
  gridLayout = false,
}: UserListsProps) {
  const displayLists = limit ? lists.slice(0, limit) : lists;

  // Grid class based on variant
  const getGridClass = () => {
    if (!gridLayout) return "space-y-8";

    switch (variant) {
      case "thumbnail-xlg":
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";
      case "thumbnail-lg":
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";
      case "thumbnail-md":
        return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4";
      case "thumbnail-sm":
        return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3";
      case "thumbnail-wide":
        return "grid grid-cols-1 sm:grid-cols-2 gap-4";
      case "card":
      case "sm":
      case "xsm":
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
      default:
        return "space-y-8";
    }
  };

  return (
    <section>
      {showViewAll && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <List className="h-5 w-5 text-purple-400" />
            Curated Lists
          </h2>
          <Link
            href="#"
            className="text-sm font-medium text-zinc-500 hover:text-white transition-colors flex items-center gap-1 group"
          >
            View all
            <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-white transition-colors" />
          </Link>
        </div>
      )}

      <div className={getGridClass()}>
        {displayLists.map((list) => (
          <ListItem key={list.id} list={list} variant={variant} />
        ))}
      </div>
    </section>
  );
}