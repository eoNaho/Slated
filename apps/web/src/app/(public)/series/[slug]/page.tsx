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
  Film,
  TrendingUp,
} from "lucide-react";
import {
  getMovie,
  getPopularReviews,
  getSimilarSeries,
  getSeriesSeasons,
} from "@/lib/queries/media";
import { SeriesActions } from "@/components/series/series-actions";
import { MediaCoverButton } from "@/components/media/media-cover-button";
import { MovieReviewCard } from "@/components/movies/movie-review-card";
import { MoviePoster } from "@/components/movies/movie-poster";
import { SeasonsPanel } from "@/components/series/seasons-panel";
import { SectionLabel } from "@/components/common/section-label";
import { StarRating } from "@/components/common/star-rating";
import { resolveImage } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const series = await getMovie(slug);
  const title = series?.title ?? slug.replace(/-/g, " ");
  const year = series?.releaseDate
    ? new Date(series.releaseDate).getFullYear()
    : null;
  return {
    title: year ? `${title} (${year}) | PixelReel` : `${title} | PixelReel`,
    description: series?.overview ?? `Watch ${title} on PixelReel.`,
    openGraph: {
      title,
      description: series?.overview ?? undefined,
      images: series?.backdropPath ? [series.backdropPath] : [],
    },
  };
}

export default async function SeriesPage({ params }: PageProps) {
  const { slug } = await params;
  const series = await getMovie(slug);

  if (!series) notFound();

  const year = series.releaseDate
    ? new Date(series.releaseDate).getFullYear()
    : null;
  const cast = series.credits?.filter((c) => c.creditType === "cast") ?? [];
  const crew = series.credits?.filter((c) => c.creditType === "crew") ?? [];
  const creators = crew.filter(
    (c) =>
      c.job === "Creator" ||
      c.job === "Series Creator" ||
      c.department === "Creating",
  );

  const [reviews, similarSeries] = await Promise.all([
    getPopularReviews(series.id),
    getSimilarSeries(series.tmdbId),
  ]);

  const genres = (series.genres ?? []).map((g) =>
    typeof g === "string" ? g : g.name,
  );

  const seasonsData = await getSeriesSeasons(series.id);
  // Filter out any invalid items just in case
  const seasons = (seasonsData || []).filter((s) => s && typeof s === "object");

  const posterSrc = series.posterPath
    ? resolveImage(series.posterPath) || series.posterPath
    : null;
  const backdropSrc = series.backdropPath
    ? resolveImage(series.backdropPath) || series.backdropPath
    : null;

  return (
    <div
      className="min-h-screen text-zinc-100"
      style={{ background: "#0a0a0e" }}
    >
      {/* ── CINEMATIC HERO ──────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "70vh", minHeight: 420 }}
      >
        {backdropSrc ? (
          <div className="absolute inset-0">
            <Image
              src={backdropSrc}
              alt={series.title}
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
          style={{
            background:
              "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 20%, rgba(13,13,15,0.8) 100%)",
          }}
        />

        {/* Bottom fade */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "85%",
            background:
              "linear-gradient(to top, #0d0d0f 0%, #0d0d0f 15%, rgba(13,13,15,0.95) 40%, rgba(13,13,15,0.4) 70%, transparent 100%)",
          }}
        />

        {/* Top fade */}
        <div
          className="absolute inset-x-0 top-0 h-40"
          style={{
            background:
              "linear-gradient(to bottom, rgba(13,13,15,0.7) 0%, rgba(13,13,15,0.3) 50%, transparent 100%)",
          }}
        />
      </div>

      {/* ── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 lg:px-8 -mt-64 relative z-10 pb-24">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-14">
          {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
          <div className="w-full lg:w-60 xl:w-68 flex-shrink-0">
            {/* Poster */}
            <div className="relative group mb-6">
              <div className="absolute -inset-3 bg-indigo-600/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div
                className="relative rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.8)] ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-[1.02]"
                style={{ aspectRatio: "2/3" }}
              >
                <MoviePoster
                  movieId={series.id}
                  title={series.title}
                  defaultPosterPath={posterSrc}
                  sizes="(max-width: 1024px) 160px, 240px"
                />
                <MediaCoverButton mediaId={series.id} />
              </div>
            </div>

            {/* MediaActions (watchlist, share, etc.) */}
            <SeriesActions series={series} />

            {/* TMDB Score */}
            {series.voteAverage && series.voteAverage > 0 ? (
              <div
                className="mt-5 p-4 rounded-xl border border-white/[0.06]"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                    TMDB
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-lg font-bold text-white">
                      {series.voteAverage.toFixed(1)}
                    </span>
                    <span className="text-zinc-600 text-sm">/10</span>
                  </div>
                </div>
                <StarRating rating={series.voteAverage} />
                {series.voteCount ? (
                  <p className="text-[11px] text-zinc-600 mt-2">
                    {series.voteCount.toLocaleString()} ratings
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Where to Watch */}
            {series.streaming && series.streaming.length > 0 && (
              <div className="mt-6">
                <SectionLabel>Where to Watch</SectionLabel>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.values(
                    series.streaming.reduce(
                      (acc, curr) => {
                        if (!acc[curr.serviceId]) acc[curr.serviceId] = { ...curr };
                        return acc;
                      },
                      {} as Record<string, (typeof series.streaming)[0]>,
                    ),
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
                          <Play className="h-3.5 w-3.5 text-indigo-400 fill-indigo-400/20" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 text-white text-[9px] font-medium text-center py-0.5 translate-y-full group-hover:translate-y-0 transition-transform leading-tight truncate px-0.5">
                        {mapping.service.name}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="mt-5 space-y-3">
              {series.runtime ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Episode
                  </span>
                  <span className="text-zinc-300 font-medium">
                    {series.runtime}m
                  </span>
                </div>
              ) : null}
              {series.releaseDate ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    First Aired
                  </span>
                  <span className="text-zinc-300 font-medium">
                    {new Date(series.releaseDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ) : null}
              {series.status ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Status
                  </span>
                  <span
                    className={`font-medium text-sm px-2 py-0.5 rounded-full ${series.status === "Ended" ? "text-red-400 bg-red-500/10" : "text-emerald-400 bg-emerald-500/10"}`}
                  >
                    {series.status.replace(/_/g, " ")}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Seasons
                </span>
                <span className="text-zinc-300 font-medium">
                  {seasons.length}
                </span>
              </div>
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {genres.map((name, i) => (
                  <Link
                    key={i}
                    href={`/series?genre=${name.toLowerCase()}`}
                    className="px-3 py-1 rounded-full text-xs border border-white/[0.07] text-zinc-400 hover:border-indigo-500/40 hover:text-indigo-300 transition-all"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    {name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 pt-2 lg:pt-10">
            {/* Title block */}
            <header className="mb-8">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] uppercase font-bold tracking-widest border border-indigo-500/20 flex items-center gap-1.5">
                  <Tv className="h-3 w-3" /> TV Series
                </span>
                {year && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-bold tracking-wider">
                    {year}
                  </span>
                )}
                {series.status && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] uppercase font-bold tracking-widest border border-amber-500/20">
                    {series.status.replace(/_/g, " ")}
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
                  textShadow: "0 10px 30px rgba(0,0,0,0.5)",
                }}
              >
                {series.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                {creators.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Created by</span>
                    <div className="flex gap-1.5">
                      {creators.map((c, i) => (
                        <span key={c.id}>
                          <Link
                            href={`/people/${c.person.id}`}
                            className="text-zinc-200 hover:text-amber-400 transition-colors font-semibold"
                          >
                            {c.person.name}
                          </Link>
                          {i < creators.length - 1 && (
                            <span className="text-zinc-700">,</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {series.originalTitle &&
                  series.originalTitle !== series.title && (
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 italic">
                        {series.originalTitle}
                      </span>
                    </div>
                  )}
              </div>
            </header>

            {series.tagline && (
              <blockquote
                className="text-lg text-zinc-400 italic mb-6 pl-4"
                style={{ borderLeft: "2px solid rgba(99,102,241,0.5)" }}
              >
                &ldquo;{series.tagline}&rdquo;
              </blockquote>
            )}

            {series.overview && (
              <p className="text-[15px] text-zinc-300 leading-relaxed mb-8 max-w-2xl">
                {series.overview}
              </p>
            )}

            <div className="border-t border-white/[0.04] mb-10" />

            {/* ── SEASONS & EPISODES ──────────────────────────────────────── */}
            <section className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <SectionLabel>Seasons & Episodes</SectionLabel>
                  <h2 className="text-xl font-bold text-white mt-1">
                    {seasons.length} Season{seasons.length !== 1 && "s"}
                    <span className="text-zinc-600 text-base font-normal ml-2">
                      · {seasons.reduce((a, s) => a + s.episodeCount, 0)}{" "}
                      episodes
                    </span>
                  </h2>
                </div>
              </div>

              <SeasonsPanel
                seasons={seasons}
                seriesId={series.id}
                seriesTitle={series.title}
              />
            </section>

            <div className="border-t border-white/[0.04] mb-10" />

            {/* ── TOP CAST ──────────────────────────────────────────────── */}
            {cast.length > 0 && (
              <section className="mb-14">
                <div className="flex items-center justify-between mb-5">
                  <SectionLabel>Top Cast</SectionLabel>
                  {cast.length > 6 && (
                    <Link
                      href={`/series/${slug}/cast`}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                    >
                      View all {cast.length}{" "}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {cast.slice(0, 6).map((credit) => (
                    <Link
                      key={credit.id}
                      href={`/people/${credit.person.id}`}
                      className="group"
                    >
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 mb-2.5 ring-1 ring-white/[0.06] group-hover:ring-indigo-500/40 transition-all duration-300">
                        {credit.person.profilePath ? (
                          <Image
                            src={credit.person.profilePath}
                            alt={credit.person.name}
                            fill
                            className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                            sizes="150px"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-3xl text-zinc-700">
                            👤
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-400 transition-colors leading-tight truncate">
                        {credit.person.name}
                      </p>
                      {credit.character && (
                        <p className="text-[11px] text-zinc-600 truncate mt-0.5">
                          {credit.character}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="border-t border-white/[0.04] mb-10" />

            {/* ── POPULAR REVIEWS ──────────────────────────────────────── */}
            <section className="mb-12">
              <SectionLabel>Popular Reviews</SectionLabel>
              {reviews.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <MovieReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <div
                  className="mt-4 py-12 rounded-2xl flex flex-col items-center gap-3 border border-white/[0.04]"
                  style={{ background: "rgba(255,255,255,0.01)" }}
                >
                  <MessageCircle className="h-10 w-10 text-zinc-800" />
                  <p className="text-zinc-600 text-sm">
                    No reviews yet. Be the first.
                  </p>
                </div>
              )}
            </section>

            {/* ── SIMILAR SERIES ───────────────────────────────────────── */}
            {similarSeries.length > 0 && (
              <section>
                <div className="border-t border-white/[0.04] mb-10" />
                <div className="flex items-center justify-between mb-5">
                  <SectionLabel>You Might Also Like</SectionLabel>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {similarSeries.slice(0, 6).map((s) => (
                    <Link
                      key={s.id}
                      href={`/series/${
                        s.localSlug ??
                        s.title
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, "")
                      }`}
                      className="group"
                    >
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 mb-2 ring-1 ring-white/[0.06] group-hover:ring-indigo-500/40 transition-all duration-300">
                        {s.posterPath ? (
                          <Image
                            src={s.posterPath}
                            alt={s.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="150px"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Tv className="h-6 w-6 text-zinc-700" />
                          </div>
                        )}
                        {s.voteAverage && s.voteAverage > 0 ? (
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-bold text-amber-400">
                            ★{s.voteAverage.toFixed(1)}
                          </div>
                        ) : null}
                      </div>
                      <p className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-400 transition-colors leading-tight line-clamp-2">
                        {s.title}
                      </p>
                      {s.releaseDate && (
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          {new Date(s.releaseDate).getFullYear()}
                        </p>
                      )}
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
