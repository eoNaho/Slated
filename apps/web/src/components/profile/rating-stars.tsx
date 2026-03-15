import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  size?: "xs" | "sm" | "md";
  showEmpty?: boolean;
}

export function RatingStars({
  rating,
  size = "sm",
  showEmpty = true,
}: RatingStarsProps) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  const sizeClasses = {
    xs: "h-2.5 w-2.5",
    sm: "h-3 w-3",
    md: "h-4 w-4",
  };

  const starSize = sizeClasses[size];

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => {
        const isFilled = i < fullStars;
        const isHalf = i === fullStars && hasHalf;

        if (!showEmpty && !isFilled && !isHalf) return null;

        return (
          <Star
            key={i}
            className={`${starSize} ${
              isFilled
                ? "fill-green-500 text-green-500"
                : isHalf
                  ? "fill-green-500/50 text-green-500"
                  : "text-zinc-700"
            }`}
          />
        );
      })}
    </div>
  );
}
