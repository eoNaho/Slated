import { Star, Heart, MessageCircle, Share2 } from "lucide-react";

interface Review {
  id: number;
  user: {
    name: string;
    avatar: string;
  };
  movieTitle: string;
  rating: number;
  content: string;
  likes: number;
  comments: number;
  poster: string;
}

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-lg transition-all group cursor-pointer h-full focus-within:ring-1 focus-within:ring-purple-500">
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-16 h-24 rounded-md overflow-hidden bg-zinc-800 shadow-lg">
          <img
            src={review.poster}
            alt={`Poster of ${review.movieTitle}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-zinc-100 text-lg group-hover:text-purple-400 transition-colors">
                {review.movieTitle}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <img
                  src={review.user.avatar}
                  alt=""
                  className="w-5 h-5 rounded-full border border-white/10"
                />
                <span className="text-xs text-zinc-400">
                  Review by{" "}
                  <span className="text-zinc-200 font-medium">
                    {review.user.name}
                  </span>
                </span>
              </div>
            </div>
            <div
              className="flex bg-zinc-950/50 px-2 py-1 rounded-md border border-white/5 h-fit"
              aria-label={`Rated ${review.rating} out of 5 stars`}
            >
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < review.rating ? "fill-green-500 text-green-500" : "text-zinc-700 fill-zinc-700"}`}
                />
              ))}
            </div>
          </div>

          <p className="mt-3 text-zinc-400 text-sm leading-relaxed line-clamp-2 group-hover:text-zinc-300 transition-colors">
            "{review.content}"
          </p>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
            <button
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors group/btn focus:text-red-400 focus:outline-none"
              aria-label="Like review"
            >
              <Heart className="h-3.5 w-3.5 group-hover/btn:fill-current" />{" "}
              {review.likes}
            </button>
            <button
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-400 transition-colors focus:text-blue-400 focus:outline-none"
              aria-label="Comment on review"
            >
              <MessageCircle className="h-3.5 w-3.5" /> {review.comments}
            </button>
            <div className="flex-1" />
            <button
              className="text-zinc-600 hover:text-white transition-colors focus:text-white focus:outline-none"
              aria-label="Share review"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Review };
