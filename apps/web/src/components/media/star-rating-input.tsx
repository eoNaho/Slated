"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  allowHalf?: boolean;
  className?: string;
}

export function StarRatingInput({
  value,
  onChange,
  size = "md",
  allowHalf = true,
  className = "",
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizes = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  };

  const displayValue = hoverValue ?? value;

  const handleMouseMove = (e: React.MouseEvent, starIndex: number) => {
    if (!allowHalf) {
      setHoverValue(starIndex + 1);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setHoverValue(starIndex + (isHalf ? 0.5 : 1));
  };

  const handleClick = (e: React.MouseEvent, starIndex: number) => {
    if (!allowHalf) {
      onChange(starIndex + 1);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    const newValue = starIndex + (isHalf ? 0.5 : 1);

    // Toggle off if clicking same value
    if (newValue === value) {
      onChange(0);
    } else {
      onChange(newValue);
    }
  };

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      onMouseLeave={() => setHoverValue(null)}
    >
      {[0, 1, 2, 3, 4].map((starIndex) => {
        const starValue = starIndex + 1;
        const isFull = displayValue >= starValue;
        const isHalf = !isFull && displayValue >= starValue - 0.5;

        return (
          <button
            key={starIndex}
            type="button"
            className="relative cursor-pointer transition-transform hover:scale-110 focus:outline-none"
            onMouseMove={(e) => handleMouseMove(e, starIndex)}
            onClick={(e) => handleClick(e, starIndex)}
          >
            {/* Background (empty) star */}
            <Star
              className={`${sizes[size]} text-zinc-700 transition-colors`}
            />

            {/* Filled star (full or half) */}
            {(isFull || isHalf) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: isHalf ? "50%" : "100%" }}
              >
                <Star
                  className={`${sizes[size]} fill-emerald-400 text-emerald-400 transition-colors`}
                />
              </div>
            )}
          </button>
        );
      })}

      {/* Rating display */}
      {value > 0 && (
        <span className="ml-2 text-sm font-medium text-zinc-400">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
