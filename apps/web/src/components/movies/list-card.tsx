import Image from "next/image";
import Link from "next/link";
import { Film, Heart } from "lucide-react";
import type { List } from "@/types";

interface ListCardProps {
  list: List;
}

export function ListCard({ list }: ListCardProps) {
  return (
    <Link
      href={`/lists/${list.user?.username}/${list.slug}`}
      className="group flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.05] hover:border-white/[0.1] transition-all"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      <div className="flex -space-x-2.5 flex-shrink-0">
        {(list.coverImages ?? []).slice(0, 3).map((img, i) => (
          <div
            key={i}
            className="w-10 h-14 rounded overflow-hidden ring-2 ring-[#0d0d0f]"
          >
            <Image src={img} alt="" width={40} height={56} className="object-cover w-full h-full" />
          </div>
        ))}
        {(!list.coverImages || list.coverImages.length === 0) && (
          <div className="w-10 h-14 rounded bg-zinc-800 flex items-center justify-center">
            <Film className="h-4 w-4 text-zinc-700" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-200 group-hover:text-amber-400 transition-colors truncate">
          {list.name}
        </p>
        {list.user && (
          <p className="text-xs text-zinc-600 truncate">
            by {list.user.displayName || list.user.username}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-700">
          <span>{list.itemsCount} films</span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {list.likesCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
