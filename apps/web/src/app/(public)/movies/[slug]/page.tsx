import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Star,
  Clock,
  Calendar,
  Play,
  DollarSign,
  TrendingUp,
  Globe,
  Film,
  Clapperboard,
} from "lucide-react";
import { formatRuntime } from "@/lib/utils";
import { getMovie, getPopularReviews, getSimilarFilms, getPopularLists } from "@/lib/queries/media";
import { MovieActions } from "@/components/movies/movie-actions";
import { MediaCoverButton } from "@/components/media/media-cover-button";
import { MoviePoster } from "@/components/movies/movie-poster";
import { CastCarousel } from "@/components/movies/cast-carousel";
import { SimilarFilmsCarousel } from "@/components/movies/similar-films-carousel";
import { WriteReviewButton } from "@/components/movies/write-review-button";
import { TrailerDialog } from "@/components/movies/trailer-dialog";
import { StarRating } from "@/components/common/star-rating";
import { SectionLabel } from "@/components/common/section-label";
import { CrewChip } from "@/components/movies/crew-chip";
import { MovieReviewCard } from "@/components/movies/movie-review-card";
import { ListCard } from "@/components/movies/list-card";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovie(slug);

  if (!movie) {
    return { title: "Movie Not Found — PixelReel" };
  }

  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const title = `${movie.title}${year ? ` (${year})` : ""}`;
  const description =
    movie.overview?.slice(0, 155) ??
    `Discover ${movie.title} on PixelReel — track, rate, and review.`;

  const directors = movie.credits
    ?.filter((c) => c.creditType === "crew" && c.job === "Director")
    .map((c) => c.person.name)
    .join(", ");

  return {
    title: `${title} — PixelReel`,
    description,
    openGraph: {
      title,
      description,
      type: "video.movie",
      siteName: "PixelReel",
      ...(movie.backdropPath && {
        images: [{ url: movie.backdropPath, width: 1280, height: 720, alt: movie.title }],
      }),
      ...(movie.releaseDate && { releaseDate: movie.releaseDate }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(movie.backdropPath && { images: [movie.backdropPath] }),
    },
    other: {
      ...(directors && { "video:director": directors }),
      ...(year && { "video:release_date": String(year) }),
    },
  };
}

export default async function MoviePage({ params }: PageProps) {
  const { slug } = await params;
  const movie = await getMovie(slug);

  if (!movie) notFound();

  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const cast = movie.credits?.filter((c) => c.creditType === "cast") ?? [];
  const crew = movie.credits?.filter((c) => c.creditType === "crew") ?? [];
  const directors = crew.filter((c) => c.job === "Director");
  const writers = crew.filter((c) => c.job === "Screenplay" || c.job === "Writer" || c.job === "Story");
  const otherCrew = crew.filter((c) => !["Director", "Screenplay", "Writer", "Story"].includes(c.job ?? ""));

  const [reviews, similarFilms, popularLists] = await Promise.all([
    getPopularReviews(movie.id),
    getSimilarFilms(movie.tmdbId),
    getPopularLists(movie.id),
  ]);

  const genres = (movie.genres ?? []).map((g) => (typeof g === "string" ? g : g.name));

  return (
    <div className="min-h-screen text-[#e8e5df]" style={{ background: "#0d0d0f" }}>
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative w-full" style={{ height: "65vh", minHeight: 380 }}>
        {movie.backdropPath ? (
          <div className="absolute inset-0">
            <Image
              src={movie.backdropPath}
              alt={movie.title}
              fill
              className="object-cover object-[center_30%]"
              priority
              sizes="100vw"
            />
            {/* Overlay to ensure text readability and add depth */}
            <div className="absolute inset-0 bg-zinc-950/20" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}

        {/* Film grain */}
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "200px 200px",
          }}
        />

        {/* Edge vignette */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 20%, rgba(13,13,15,0.8) 100%)" }}
        />

        {/* Bottom fade - deeper and smoother */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: "85%", background: "linear-gradient(to top, #0d0d0f 0%, #0d0d0f 15%, rgba(13,13,15,0.95) 40%, rgba(13,13,15,0.4) 70%, transparent 100%)" }}
        />

        {/* Top fade */}
        <div
          className="absolute inset-x-0 top-0 h-40"
          style={{ background: "linear-gradient(to bottom, rgba(13,13,15,0.7) 0%, rgba(13,13,15,0.3) 50%, transparent 100%)" }}
        />

        {movie.trailerUrl && (
          <div className="absolute bottom-6 right-6 lg:bottom-8 lg:right-8">
            <TrailerDialog trailerUrl={movie.trailerUrl} movieTitle={movie.title} />
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 lg:px-8 -mt-52 relative z-10 pb-20">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">

          {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
          <div className="w-full lg:w-56 xl:w-64 flex-shrink-0">
            {/* Poster with glow */}
            <div className="relative group mb-8">
              <div 
                className="absolute -inset-4 bg-purple-600/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "radial-gradient(circle, rgba(147,51,234,0.3) 0%, transparent 70%)" }}
              />
              <div
                className="relative rounded-xl overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                style={{
                  aspectRatio: "2/3",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)",
                }}
              >
                <MoviePoster
                  movieId={movie.id}
                  title={movie.title}
                  defaultPosterPath={movie.posterPath}
                />
                <MediaCoverButton mediaId={movie.id} />
              </div>
            </div>

            <MovieActions movie={movie} />

            {movie.voteAverage && movie.voteAverage > 0 ? (
              <div className="mt-5 p-4 rounded-xl border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">TMDB Rating</span>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-lg font-bold text-white">{movie.voteAverage.toFixed(1)}</span>
                    <span className="text-zinc-600 text-sm">/10</span>
                  </div>
                </div>
                <StarRating rating={movie.voteAverage} />
                {movie.voteCount ? (
                  <p className="text-[11px] text-zinc-600 mt-2">{movie.voteCount.toLocaleString()} ratings</p>
                ) : null}
              </div>
            ) : null}

            {movie.streaming && movie.streaming.length > 0 && (
              <div className="mt-8">
                <SectionLabel>Where to Watch</SectionLabel>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.values(
                    movie.streaming.reduce((acc, curr) => {
                      if (!acc[curr.serviceId]) acc[curr.serviceId] = { ...curr };
                      return acc;
                    }, {} as Record<string, typeof movie.streaming[0]>)
                  ).map((mapping) => (
                    <a
                      key={mapping.serviceId}
                      href={mapping.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={mapping.service.name}
                      className="group relative w-11 h-11 rounded-xl bg-zinc-800 border border-white/5 overflow-hidden hover:border-white/20 hover:scale-105 transition-all"
                    >
                      {mapping.service.logoPath ? (
                        <Image
                          src={mapping.service.logoPath}
                          alt={mapping.service.name}
                          width={44}
                          height={44}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-4 w-4 text-amber-400 fill-amber-400/20" />
                        </div>
                      )}
                      {/* Name tooltip on hover */}
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 text-white text-[9px] font-medium text-center py-0.5 translate-y-full group-hover:translate-y-0 transition-transform leading-tight truncate px-0.5">
                        {mapping.service.name}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {movie.runtime ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Runtime</span>
                  <span className="text-zinc-300 font-medium">{formatRuntime(movie.runtime)}</span>
                </div>
              ) : null}
              {movie.releaseDate ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Released</span>
                  <span className="text-zinc-300 font-medium">
                    {new Date(movie.releaseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              ) : null}
              {movie.status ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Status</span>
                  <span className="text-zinc-300 font-medium capitalize">{movie.status.replace(/_/g, " ")}</span>
                </div>
              ) : null}
              {movie.budget && movie.budget > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" />Budget</span>
                  <span className="text-zinc-300 font-medium">${(movie.budget / 1_000_000).toFixed(0)}M</span>
                </div>
              ) : null}
              {movie.revenue && movie.revenue > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Revenue</span>
                  <span className="text-zinc-300 font-medium">${(movie.revenue / 1_000_000).toFixed(0)}M</span>
                </div>
              ) : null}
            </div>

            {genres.length > 0 && (
              <div className="mt-5">
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((name, i) => (
                    <Link
                      key={i}
                      href={`/movies?genre=${name.toLowerCase()}`}
                      className="px-3 py-1 rounded-full text-xs border border-white/[0.07] text-zinc-400 transition-colors"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      {name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT MAIN CONTENT ───────────────────────────────────────── */}
          <div className="flex-1 min-w-0 pt-2 lg:pt-8">

            <header className="mb-8">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {year && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-bold tracking-wider">
                    {year}
                  </span>
                )}
                {movie.status && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] uppercase font-bold tracking-widest border border-amber-500/20">
                    {movie.status.replace(/_/g, " ")}
                  </span>
                )}
                {genres.slice(0, 3).map((name, i) => (
                  <span key={i} className="text-xs text-zinc-500 font-medium">
                    {i > 0 && " • "} {name}
                  </span>
                ))}
              </div>

              <h1
                className="font-black text-white leading-[0.9] tracking-tight mb-4"
                style={{ 
                  fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                  textShadow: "0 10px 30px rgba(0,0,0,0.5)"
                }}
              >
                {movie.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                {directors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Directed by</span>
                    <div className="flex gap-1.5">
                      {directors.map((d, i) => (
                        <span key={d.id}>
                          <Link
                            href={`/people/${d.person.id}`}
                            className="text-zinc-200 hover:text-amber-400 transition-colors font-semibold"
                          >
                            {d.person.name}
                          </Link>
                          {i < directors.length - 1 && <span className="text-zinc-700">,</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {movie.originalTitle && movie.originalTitle !== movie.title && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 italic">{movie.originalTitle}</span>
                  </div>
                )}
              </div>
            </header>

            {movie.tagline && (
              <blockquote
                className="text-lg text-zinc-400 italic mb-6 pl-4"
                style={{ borderLeft: "2px solid rgba(245,196,24,0.5)" }}
              >
                &ldquo;{movie.tagline}&rdquo;
              </blockquote>
            )}

            {movie.overview && (
              <p className="text-[15px] text-zinc-300 leading-relaxed mb-8 max-w-2xl">
                {movie.overview}
              </p>
            )}

            <div className="border-t border-white/[0.04] mb-12" />

            {cast.length > 0 && (
              <section className="mb-16">
                <SectionLabel>Cast</SectionLabel>
                <div className="mt-6">
                  <CastCarousel cast={cast} />
                </div>
              </section>
            )}

            {crew.length > 0 && (
              <section className="mb-16">
                <SectionLabel>Crew</SectionLabel>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {directors.map((credit) => (
                    <CrewChip key={credit.id} credit={credit} highlight />
                  ))}
                  {writers.map((credit) => (
                    <CrewChip key={credit.id} credit={credit} />
                  ))}
                  {otherCrew.slice(0, 8).map((credit) => (
                    <CrewChip key={credit.id} credit={credit} />
                  ))}
                </div>
              </section>
            )}

            <div className="border-t border-white/[0.04] mb-12" />

            <section className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <SectionLabel>Popular Reviews</SectionLabel>
                <WriteReviewButton movie={movie} />
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.slice(0, 4).map((review) => (
                    <MovieReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <div className="py-12 rounded-xl flex flex-col items-center gap-3 border border-white/[0.05]" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <Clapperboard className="h-10 w-10 text-zinc-800" />
                  <p className="text-zinc-600 text-sm">No reviews yet. Be the first.</p>
                </div>
              )}
            </section>

            {similarFilms.length > 0 && (
              <section className="mb-10">
                <div className="border-t border-white/[0.06] mb-8" />
                <SectionLabel>You Might Also Like</SectionLabel>
                <SimilarFilmsCarousel films={similarFilms} />
              </section>
            )}

            {popularLists.length > 0 && (
              <section className="mb-10">
                <div className="border-t border-white/[0.06] mb-8" />
                <div className="flex items-center justify-between mb-5">
                  <SectionLabel>Appears In Lists</SectionLabel>
                  <Link
                    href={`/movies/${slug}/lists`}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {popularLists.map((list) => (
                    <ListCard key={list.id} list={list} />
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
