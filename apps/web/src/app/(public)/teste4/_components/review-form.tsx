"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "@/components/ui/input";

export function ReviewForm() {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-md">
      <h3 className="text-xl font-bold text-white mb-4">Escreva sua crítica</h3>

      <div className="mb-6">
        <div className="text-sm text-zinc-400 mb-2">Sua avaliação</div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              className="p-1 focus:outline-none"
            >
              <Star
                className={`h-6 w-6 ${
                  (
                    hoverRating !== null
                      ? star <= hoverRating
                      : star <= (rating || 0)
                  )
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-zinc-600"
                } transition-colors`}
              />
            </button>
          ))}
          {rating && (
            <span className="ml-2 text-lg font-bold text-white">{rating}</span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Input
            placeholder="Título da sua crítica"
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-purple-500"
          />
        </div>
        <div>
          <Textarea
            placeholder="Escreva sua crítica aqui..."
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-purple-500 min-h-[150px]"
          />
        </div>
        <div className="flex justify-end">
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0">
            Publicar Crítica
          </Button>
        </div>
      </div>
    </div>
  );
}
