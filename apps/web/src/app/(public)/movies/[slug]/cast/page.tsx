import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Users, ChevronLeft } from "lucide-react";
import { getMovie } from "@/lib/queries/media";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovie(slug);
  const title = movie?.title ?? slug.replace(/-/g, " ");
  return {
    title: `${title} — Cast | PixelReel`,
    description: `Full cast list for ${title}.`,
  };
}

export default async function CastPage({ params }: PageProps) {
  const { slug } = await params;
  const movie = await getMovie(slug);

  if (!movie) notFound();

  const cast = movie.credits?.filter((c) => c.creditType === "cast") || [];
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-white/10 bg-zinc-900/50">
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/movies/${slug}`}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>

            <div className="flex items-center gap-4">
              {movie.posterPath && (
                <div className="w-12 h-18 rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={movie.posterPath}
                    alt={movie.title}
                    width={48}
                    height={72}
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-white">
                  {movie.title}{" "}
                  {year && <span className="text-zinc-400">({year})</span>}
                </h1>
                <p className="text-sm text-zinc-400">Cast</p>
              </div>
            </div>
          </div>

          <nav className="flex gap-6 mt-6 -mb-px">
            <Link href={`/movies/${slug}`} className="pb-3 text-sm font-medium text-zinc-500 hover:text-white transition-colors">Overview</Link>
            <Link href={`/movies/${slug}/cast`} className="pb-3 text-sm font-medium text-white border-b-2 border-purple-500">Cast</Link>
            <Link href={`/movies/${slug}/crew`} className="pb-3 text-sm font-medium text-zinc-500 hover:text-white transition-colors">Crew</Link>
            <Link href={`/movies/${slug}/reviews`} className="pb-3 text-sm font-medium text-zinc-500 hover:text-white transition-colors">Reviews</Link>
          </nav>
        </div>
      </div>

      {/* Cast Grid */}
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Users className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Cast ({cast.length})</h2>
        </div>

        {cast.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {cast.map((credit) => (
              <Link key={credit.id} href={`/people/${credit.person.id}`} className="group">
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2 ring-1 ring-white/10 group-hover:ring-purple-500/50 transition-all">
                  {credit.person.profilePath ? (
                    <Image
                      src={credit.person.profilePath}
                      alt={credit.person.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-3xl text-zinc-600">
                      👤
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors truncate">
                  {credit.person.name}
                </p>
                {credit.character && (
                  <p className="text-xs text-zinc-500 truncate">{credit.character}</p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No cast information available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
