import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number; // 0-10 scale, displayed as 5 stars
}

export function StarRating({ rating }: StarRatingProps) {
  const filled = Math.floor(rating / 2);
  const half = rating % 2 >= 1;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < filled
              ? "fill-amber-400 text-amber-400"
              : i === filled && half
              ? "fill-amber-400/50 text-amber-400"
              : "text-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}
