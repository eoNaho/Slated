import type React from "react";
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
  Heart,
  MessageCircle,
  Film,
  Clapperboard,
} from "lucide-react";
import { mediaApi } from "@/lib/api";
import type { MediaDetails, Review, List, SearchResult } from "@/types";
import { formatRuntime } from "@/lib/utils";
import { MovieActions } from "@/components/movies/movie-actions";
import { CastCarousel } from "@/components/movies/cast-carousel";
import { SimilarFilmsCarousel } from "@/components/movies/similar-films-carousel";
import { WriteReviewButton } from "@/components/movies/write-review-button";
import { TrailerDialog } from "@/components/movies/trailer-dialog";

// ─── Data Fetchers ───────────────────────────────────────────────────────────

async function getMovie(slug: string): Promise<MediaDetails | null> {
  try {
    const res = await mediaApi.getBySlug(slug);
    return res.data ?? null;
  } catch {
    return null;
  }
}

async function getPopularReviews(mediaId: string): Promise<Review[]> {
  try {
    const res = await mediaApi.getReviews(mediaId, "popular", 1);
    return res.data ?? [];
  } catch {
    return [];
  }
}

async function getSimilarFilms(tmdbId: number): Promise<SearchResult[]> {
  try {
    const res = await mediaApi.getSimilar(tmdbId, "movie", 1);
    return res.data?.results ?? [];
  } catch {
    return [];
  }
}

async function getPopularLists(mediaId: string): Promise<List[]> {
  try {
    const res = await mediaApi.getLists(mediaId, 1, 4);
    return res.data ?? [];
  } catch {
    return [];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  // rating is 0-10, display as 5 stars
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

function SectionLabel({ children }: { children: React.ReactNode; }) {
  return (
    <span className="inline-block text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-4">
      {children}
    </span>
  );
}

// ─── Metadata ────────────────────────────────────────────────────────────────

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

// ─── Page ────────────────────────────────────────────────────────────────────

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
        {/* Backdrop */}
        {movie.backdropPath ? (
          <Image
            src={movie.backdropPath}
            alt={movie.title}
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
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
          style={{ background: "radial-gradient(ellipse 120% 100% at 50% 50%, transparent 30%, rgba(13,13,15,0.75) 100%)" }}
        />

        {/* Bottom fade */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: "75%", background: "linear-gradient(to top, #0d0d0f 0%, #0d0d0f 10%, rgba(13,13,15,0.9) 45%, transparent 100%)" }}
        />

        {/* Top fade */}
        <div
          className="absolute inset-x-0 top-0 h-20"
          style={{ background: "linear-gradient(to bottom, rgba(13,13,15,0.5), transparent)" }}
        />

        {/* Trailer button */}
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
            {/* Poster */}
            <div
              className="relative rounded-xl overflow-hidden mb-5"
              style={{
                aspectRatio: "2/3",
                boxShadow: "0 32px 80px rgba(0,0,0,0.9), 0 8px 24px rgba(0,0,0,0.6)",
              }}
            >
              {movie.posterPath ? (
                <Image
                  src={movie.posterPath}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 200px, 256px"
                />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                  <Film className="h-16 w-16 text-zinc-800" />
                </div>
              )}
            </div>

            {/* Actions */}
            <MovieActions movie={movie} />

            {/* TMDB Rating */}
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

            {/* Where to Watch */}
            {movie.streaming && movie.streaming.length > 0 && (
              <div className="mt-5">
                <SectionLabel>Where to Watch</SectionLabel>
                <div className="space-y-1.5">
                  {movie.streaming.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors border border-white/[0.04] hover:border-white/10"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <Play className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                      <span className="text-sm text-zinc-200">{service.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Movie Details (sidebar) */}
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

            {/* Genres */}
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

            {/* Title Block */}
            <header className="mb-7">
              <h1
                className="font-black text-white leading-none tracking-tight mb-3"
                style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)" }}
              >
                {movie.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-zinc-500">
                {year && (
                  <span className="font-medium text-zinc-300">{year}</span>
                )}
                {movie.originalTitle && movie.originalTitle !== movie.title && (
                  <span className="italic text-zinc-600">{movie.originalTitle}</span>
                )}
                {directors.length > 0 && (
                  <span>
                    Directed by{" "}
                    {directors.map((d, i) => (
                      <span key={d.id}>
                        <Link
                          href={`/people/${d.person.id}`}
                          className="text-zinc-300 hover:text-amber-400 transition-colors font-medium"
                        >
                          {d.person.name}
                        </Link>
                        {i < directors.length - 1 && ", "}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </header>

            {/* Tagline */}
            {movie.tagline && (
              <blockquote
                className="text-lg text-zinc-400 italic mb-6 pl-4"
                style={{ borderLeft: "2px solid rgba(245,196,24,0.5)" }}
              >
                &ldquo;{movie.tagline}&rdquo;
              </blockquote>
            )}

            {/* Overview */}
            {movie.overview && (
              <p className="text-[15px] text-zinc-300 leading-relaxed mb-8 max-w-2xl">
                {movie.overview}
              </p>
            )}

            {/* Divider */}
            <div className="border-t border-white/[0.06] mb-8" />

            {/* ── CAST ─────────────────────────────────────────────────── */}
            {cast.length > 0 && (
              <section className="mb-10">
                <SectionLabel>Cast</SectionLabel>
                <CastCarousel cast={cast} />
              </section>
            )}

            {/* ── CREW ─────────────────────────────────────────────────── */}
            {crew.length > 0 && (
              <section className="mb-10">
                <SectionLabel>Crew</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {/* Directors first */}
                  {directors.map((credit) => (
                    <CrewChip key={credit.id} credit={credit} highlight />
                  ))}
                  {/* Writers */}
                  {writers.map((credit) => (
                    <CrewChip key={credit.id} credit={credit} />
                  ))}
                  {/* Other crew */}
                  {otherCrew.slice(0, 8).map((credit) => (
                    <CrewChip key={credit.id} credit={credit} />
                  ))}
                </div>
              </section>
            )}

            <div className="border-t border-white/[0.06] mb-8" />

            {/* ── REVIEWS ──────────────────────────────────────────────── */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <SectionLabel>Popular Reviews</SectionLabel>
                <WriteReviewButton movie={movie} />
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.slice(0, 4).map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <div className="py-12 rounded-xl flex flex-col items-center gap-3 border border-white/[0.05]" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <Clapperboard className="h-10 w-10 text-zinc-800" />
                  <p className="text-zinc-600 text-sm">No reviews yet. Be the first.</p>
                </div>
              )}
            </section>

            {/* ── SIMILAR FILMS ────────────────────────────────────────── */}
            {similarFilms.length > 0 && (
              <section className="mb-10">
                <div className="border-t border-white/[0.06] mb-8" />
                <SectionLabel>You Might Also Like</SectionLabel>
                <SimilarFilmsCarousel films={similarFilms} />
              </section>
            )}

            {/* ── POPULAR LISTS ─────────────────────────────────────────── */}
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

// ─── Sub-components (server, no interactivity) ───────────────────────────────

function CrewChip({
  credit,
  highlight = false,
}: {
  credit: {
    id: string;
    job?: string | null;
    person: { id: string; name: string };
  };
  highlight?: boolean;
}) {
  return (
    <Link
      href={`/people/${credit.person.id}`}
      className="group flex items-center gap-2 px-3 py-2 rounded-lg transition-all border"
      style={{
        background: highlight ? "rgba(245,196,24,0.06)" : "rgba(255,255,255,0.025)",
        borderColor: highlight ? "rgba(245,196,24,0.2)" : "rgba(255,255,255,0.06)",
      }}
    >
      <div>
        <p className="text-[13px] font-semibold text-zinc-200 group-hover:text-amber-400 transition-colors leading-tight">
          {credit.person.name}
        </p>
        {credit.job && (
          <p className="text-[11px] text-zinc-600 leading-tight">{credit.job}</p>
        )}
      </div>
    </Link>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div
      className="rounded-xl p-4 border border-white/[0.05] transition-colors hover:border-white/[0.09]"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-white/10">
          {review.user?.avatarUrl ? (
            <Image
              src={review.user.avatarUrl}
              alt={review.user.username}
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-base">👤</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Link
              href={`/profile/${review.user?.username}`}
              className="text-sm font-semibold text-zinc-200 hover:text-amber-400 transition-colors"
            >
              {review.user?.displayName || review.user?.username}
            </Link>
            {review.rating ? <StarRating rating={review.rating} /> : null}
            <span className="text-xs text-zinc-700 ml-auto flex-shrink-0">
              {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
          </div>

          {review.title && (
            <p className="text-sm font-medium text-zinc-200 mb-1">{review.title}</p>
          )}
          <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{review.content}</p>

          <div className="flex items-center gap-4 mt-2.5 text-xs text-zinc-600">
            <span className="flex items-center gap-1 hover:text-zinc-400 cursor-pointer transition-colors">
              <Heart className="h-3 w-3" />
              {review.likesCount}
            </span>
            <span className="flex items-center gap-1 hover:text-zinc-400 cursor-pointer transition-colors">
              <MessageCircle className="h-3 w-3" />
              {review.commentsCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListCard({ list }: { list: List }) {
  return (
    <Link
      href={`/lists/${list.id}`}
      className="group flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.05] hover:border-white/[0.1] transition-all"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      {/* Cover thumbnails */}
      <div className="flex -space-x-2.5 flex-shrink-0">
        {(list.coverImages ?? []).slice(0, 3).map((img, i) => (
          <div
            key={i}
            className="w-10 h-14 rounded overflow-hidden ring-2 ring-[#0d0d0f]"
          >
            <Image src={img} alt="" width={40} height={56} className="object-cover w-full h-full" />
          </div>
        ))}
        {(!list.coverImages || list.coverImages.length === 0) && (
          <div className="w-10 h-14 rounded bg-zinc-800 flex items-center justify-center">
            <Film className="h-4 w-4 text-zinc-700" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-200 group-hover:text-amber-400 transition-colors truncate">
          {list.name}
        </p>
        {list.user && (
          <p className="text-xs text-zinc-600 truncate">
            by {list.user.displayName || list.user.username}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-700">
          <span>{list.itemsCount} films</span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {list.likesCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
