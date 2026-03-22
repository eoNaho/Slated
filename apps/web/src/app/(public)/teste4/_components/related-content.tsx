"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RelatedItem {
  id: string;
  title: string;
  type: "movie" | "series";
  poster?: string;
  rating: number;
  year?: number;
}

interface RelatedContentProps {
  related: RelatedItem[];
  title: string;
}

export function RelatedContent({ related, title }: RelatedContentProps) {
  return (
    <section className="bg-white/5 backdrop-blur-md p-8 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <Button
          variant="outline"
          className="border-purple-500/50 text-purple-400 hover:text-white hover:bg-purple-600/20"
          asChild
        >
          <Link href="#" className="flex items-center">
            Ver Todos <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {related.map((item, index) => (
          <div key={index} className="group">
            <div className="aspect-[2/3] overflow-hidden rounded-md mb-2 relative bg-zinc-800">
              <Image
                fill
                src={item.poster || "/placeholder.svg"}
                alt={item.title}
                className="object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

              {/* Rating Badge */}
              <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 text-xs rounded-md backdrop-blur-sm">
                {item.rating.toFixed(1)}
              </div>

              {/* Type Badge */}
              <div className="absolute bottom-2 left-2 bg-black/70 text-white px-1.5 py-0.5 text-[10px] rounded-md backdrop-blur-sm">
                {item.type === "movie" ? "Filme" : "Série"}
              </div>
            </div>
            <h3 className="font-medium text-white text-sm line-clamp-1">
              {item.title}
            </h3>
            <p className="text-xs text-zinc-500">{item.year}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
