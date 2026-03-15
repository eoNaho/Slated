import { Film } from "lucide-react";

interface FavoriteGenresProps {
  genres: string[];
}

export function FavoriteGenres({ genres }: FavoriteGenresProps) {
  if (!genres || genres.length === 0) return null;

  return (
    <section className="bg-zinc-900/20 rounded-3xl p-6 border border-white/5 backdrop-blur-sm">
      <h3 className="font-bold text-white flex items-center gap-2 mb-5">
        <Film className="h-4 w-4 text-pink-400" />
        Favorite Genres
      </h3>
      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => (
          <span
            key={genre}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-300 border border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/20 transition-all cursor-pointer"
          >
            {genre}
          </span>
        ))}
      </div>
    </section>
  );
}
