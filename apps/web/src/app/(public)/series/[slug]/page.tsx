import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Star,
  Clock,
  Calendar,
  Play,
  Users,
  Tv,
  Tag,
  Globe,
  Heart,
  MessageCircle,
  ChevronRight,
  Layers,
} from "lucide-react";
import { getMovie, getPopularReviews, getSimilarSeries } from "@/lib/queries/media";
import { MovieActions } from "@/components/movies/movie-actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const series = await getMovie(slug);
  const title = series?.title ?? slug.replace(/-/g, " ");
  const year = series?.releaseDate ? new Date(series.releaseDate).getFullYear() : null;
  return {
    title: year ? `${title} (${year}) | PixelReel` : `${title} | PixelReel`,
    description: series?.overview ?? `Watch ${title} on PixelReel.`,
  };
}

export default async function SeriesPage({ params }: PageProps) {
  const { slug } = await params;
  const series = await getMovie(slug);

  if (!series) notFound();

  const year = series.releaseDate ? new Date(series.releaseDate).getFullYear() : null;

  const cast = series.credits?.filter((c) => c.creditType === "cast") ?? [];
  const crew = series.credits?.filter((c) => c.creditType === "crew") ?? [];
  const creators = crew.filter(
    (c) => c.job === "Creator" || c.job === "Series Creator" || c.department === "Creating"
  );

  const [reviews, similarSeries] = await Promise.all([
    getPopularReviews(series.id),
    getSimilarSeries(series.tmdbId),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Backdrop */}
      <div className="relative h-[60vh] w-full">
        {series.backdropPath ? (
          <Image src={series.backdropPath} alt={series.title} fill className="object-cover" priority />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-zinc-900 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30" />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 -mt-72 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 mb-4">
              {series.posterPath ? (
                <Image src={series.posterPath} alt={series.title} fill className="object-cover" priority />
              ) : (
                <div className="h-full w-full bg-zinc-800 flex items-center justify-center">
                  <Tv className="h-16 w-16 text-zinc-700" />
                </div>
              )}
            </div>

            <MovieActions movie={series} />

            {series.voteAverage && series.voteAverage > 0 ? (
              <div className="mt-6 p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-xl font-bold text-white">{series.voteAverage.toFixed(1)}</span>
                    <span className="text-zinc-500">/10</span>
                  </div>
                </div>
                {series.voteCount ? (
                  <p className="text-xs text-zinc-500">{series.voteCount.toLocaleString()} votes</p>
                ) : null}
              </div>
            ) : null}

            {series.streaming && series.streaming.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Where to Watch
                </h3>
                <div className="space-y-2">
                  {series.streaming.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
                    >
                      <Play className="h-4 w-4 text-purple-400" />
                      <span className="text-sm text-white">{service.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="flex-1 min-w-0">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-xs bg-indigo-600 text-white font-medium">Series</span>
                {year && <span className="text-zinc-400">{year}</span>}
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3">{series.title}</h1>

              {series.originalTitle && series.originalTitle !== series.title && (
                <p className="text-lg text-zinc-500 mb-2">{series.originalTitle}</p>
              )}

              {creators.length > 0 && (
                <p className="text-zinc-400">
                  Created by{" "}
                  {creators.map((c, i) => (
                    <span key={c.id}>
                      <Link href={`/people/${c.person.id}`} className="text-white hover:text-purple-400 transition-colors">
                        {c.person.name}
                      </Link>
                      {i < creators.length - 1 && ", "}
                    </span>
                  ))}
                </p>
              )}
            </div>

            {series.tagline && (
              <p className="text-xl italic text-zinc-400 mb-6 border-l-2 border-indigo-500 pl-4">
                {series.tagline}
              </p>
            )}

            {series.overview && (
              <p className="text-zinc-300 leading-relaxed text-lg mb-8">{series.overview}</p>
            )}

            {/* Tabs */}
            <div className="border-b border-white/10 mb-8">
              <nav className="flex gap-8">
                <span className="pb-3 text-sm font-medium text-white border-b-2 border-indigo-500">Overview</span>
                <Link href={`/series/${slug}/cast`} className="pb-3 text-sm font-medium text-zinc-500 hover:text-white transition-colors">Cast</Link>
                <Link href={`/series/${slug}/crew`} className="pb-3 text-sm font-medium text-zinc-500 hover:text-white transition-colors">Crew</Link>
                <Link href={`/series/${slug}/reviews`} className="pb-3 text-sm font-medium text-zinc-500 hover:text-white transition-colors">Reviews</Link>
              </nav>
            </div>

            {/* Cast */}
            {cast.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-400" />
                    Cast
                  </h2>
                  {cast.length > 6 && (
                    <Link href={`/series/${slug}/cast`} className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">
                      View all {cast.length} <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {cast.slice(0, 6).map((credit) => (
                    <Link key={credit.id} href={`/people/${credit.person.id}`} className="group">
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2 ring-1 ring-white/10 group-hover:ring-indigo-500/50 transition-all">
                        {credit.person.profilePath ? (
                          <Image src={credit.person.profilePath} alt={credit.person.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-3xl text-zinc-600">👤</div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors truncate">{credit.person.name}</p>
                      {credit.character && <p className="text-xs text-zinc-500 truncate">{credit.character}</p>}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Details */}
            <section className="mb-12">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                <Tv className="h-5 w-5 text-indigo-400" />
                Details
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {series.runtime ? (
                  <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs uppercase">Ep. Runtime</span>
                    </div>
                    <p className="text-white font-medium">{series.runtime}m</p>
                  </div>
                ) : null}
                {series.releaseDate ? (
                  <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs uppercase">First Aired</span>
                    </div>
                    <p className="text-white font-medium">
                      {new Date(series.releaseDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                ) : null}
                {series.status ? (
                  <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 mb-1">
                      <Globe className="h-4 w-4" />
                      <span className="text-xs uppercase">Status</span>
                    </div>
                    <p className="text-white font-medium capitalize">{series.status.replace("_", " ")}</p>
                  </div>
                ) : null}
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Layers className="h-4 w-4" />
                    <span className="text-xs uppercase">Type</span>
                  </div>
                  <p className="text-white font-medium">TV Series</p>
                </div>
              </div>
            </section>

            {/* Genres */}
            {series.genres && series.genres.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                  <Tag className="h-5 w-5 text-indigo-400" />
                  Genres
                </h2>
                <div className="flex flex-wrap gap-2">
                  {series.genres.map((genre, i) => {
                    const name = typeof genre === "string" ? genre : genre.name;
                    return (
                      <Link key={i} href={`/series?genre=${name.toLowerCase()}`} className="px-4 py-2 rounded-full bg-zinc-900/50 border border-white/10 text-white hover:bg-indigo-600/20 hover:border-indigo-500/50 transition-colors">
                        {name}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-indigo-400" />
                  Popular Reviews
                </h2>
                <Link href={`/series/${slug}/reviews`} className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">
                  View all <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                          {review.user?.avatarUrl ? (
                            <Image src={review.user.avatarUrl} alt={review.user.username} width={40} height={40} className="rounded-full" />
                          ) : (
                            <span className="text-lg">👤</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/profile/${review.user?.username}`} className="font-medium text-white hover:text-indigo-400">
                              {review.user?.displayName || review.user?.username}
                            </Link>
                            {review.rating && (
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`h-3 w-3 ${i < Math.floor(review.rating! / 2) ? "fill-yellow-400 text-yellow-400" : "text-zinc-600"}`} />
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-zinc-300 text-sm line-clamp-3">{review.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{review.likesCount}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{review.commentsCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-zinc-900/30 border border-white/5 text-center">
                  <MessageCircle className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500">No reviews yet. Be the first!</p>
                </div>
              )}
            </section>

            {/* Similar Series */}
            {similarSeries.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                  <Tv className="h-5 w-5 text-indigo-400" />
                  Similar Series
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {similarSeries.map((s) => (
                    <Link
                      key={s.id}
                      href={`/series/${s.localSlug ?? s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                      className="group"
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2 ring-1 ring-white/10 group-hover:ring-indigo-500/50 transition-all">
                        {s.posterPath ? (
                          <Image src={s.posterPath} alt={s.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center"><Tv className="h-8 w-8 text-zinc-600" /></div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors truncate">{s.title}</p>
                      {s.releaseDate && <p className="text-xs text-zinc-500">{new Date(s.releaseDate).getFullYear()}</p>}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
