import Link from "next/link";
import { Heart, ChevronRight } from "lucide-react";
import type { FavoriteFilm } from "@/types";
import { slugify } from "@/lib/utils";

interface FavoriteFilmsProps {
  films: FavoriteFilm[];
  isEditable?: boolean;
}

// Extended interface for films with director info
interface FavoriteFilmWithDirector extends FavoriteFilm {
  director?: string;
}

export function FavoriteFilms({ films, isEditable }: FavoriteFilmsProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <Heart className="h-5 w-5 text-purple-400" />
          Favorite Films
        </h2>
        {isEditable && (
          <Link
            href="#"
            className="text-sm font-medium text-zinc-500 hover:text-white transition-colors flex items-center gap-1 group"
          >
            Edit
            <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-white transition-colors" />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(films as FavoriteFilmWithDirector[]).map((film) => (
          <Link
            key={film.id}
            href={`/movies/${slugify(film.title)}`}
            className="group relative block"
          >
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 shadow-lg ring-1 ring-white/10 group-hover:ring-purple-500/50 transition-all duration-300 relative z-10 group-hover:-translate-y-2">
              <img
                src={film.posterPath}
                alt={film.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                {film.director ? (
                  <>
                    <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">
                      Directed by
                    </p>
                    <p className="text-sm font-medium text-white">
                      {film.director}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-white truncate">
                      {film.title}
                    </p>
                    <p className="text-xs text-zinc-400">{film.year}</p>
                  </>
                )}
              </div>
            </div>
            {/* Reflection Effect */}
            <div className="absolute top-full left-0 right-0 h-10 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-20 scale-y-[-1] blur-sm transition-all duration-300 transform translate-y-2 pointer-events-none" />
          </Link>
        ))}
      </div>
    </section>
  );
}
