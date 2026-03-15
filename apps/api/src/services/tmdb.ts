import { db, media, genres, mediaGenres, people, mediaCredits } from "../db";
import { eq, inArray } from "drizzle-orm";
import { storageService } from "./storage";
import { logger } from "../utils/logger";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

if (!TMDB_API_KEY) {
  logger.warn("TMDB_API_KEY is not set. Media sync will fail.");
}

// ============================================================================
// Types
// ============================================================================

interface TMDBCredit {
  id: number;
  name: string;
  original_name: string;
  character?: string;
  department?: string;
  job?: string;
  profile_path?: string | null;
  gender?: number;
  known_for_department?: string;
  popularity?: number;
  order?: number;
}

interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBMediaDetails {
  id: number;
  imdb_id?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  tagline?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  budget?: number;
  revenue?: number;
  popularity: number;
  vote_average: number;
  vote_count: number;
  status: string;
  original_language: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  homepage?: string;
  genres: TMDBGenre[];
  credits: {
    cast: TMDBCredit[];
    crew: TMDBCredit[];
  };
  videos?: {
    results: { key: string; type: string; site: string }[];
  };
  // TV series use external_ids to expose imdb_id (movies have it directly)
  external_ids?: {
    imdb_id?: string;
    tvdb_id?: number;
  };
}

export interface SearchResult {
  id: number;
  tmdbId: number;
  mediaType: "movie" | "series";
  title: string;
  originalTitle?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string;
  voteAverage?: number;
  voteCount?: number;
  overview?: string;
  isLocal: boolean; // true = already in our DB
  localId?: string;
  localSlug?: string;
}

export interface SearchOptions {
  page?: number;
  language?: string;
  year?: number;
  includeAdult?: boolean;
}

export interface PaginatedResult<T> {
  results: T[];
  page: number;
  totalPages: number;
  totalResults: number;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

/**
 * Get full image URL from TMDB path
 */
function getTmdbImageUrl(
  path: string | null | undefined,
  size = "original"
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

// ============================================================================
// TMDB Service
// ============================================================================

export class TMDBService {
  /**
   * Fetch from TMDB API with retry
   */
  private async fetch<T>(
    endpoint: string,
    params: Record<string, string> = {},
    retries = 3
  ): Promise<T> {
    // Filter out empty strings so they don't override defaults
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== "" && v != null)
    );
    const searchParams = new URLSearchParams({
      api_key: TMDB_API_KEY!,
      language: "en-US",
      ...cleanParams,
    });

    const url = `${TMDB_BASE_URL}${endpoint}?${searchParams}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url);

        if (!res.ok) {
          if (res.status === 429) {
            // Rate limited - wait and retry
            const retryAfter = parseInt(res.headers.get("Retry-After") || "2");
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }
          throw new Error(`TMDB API Error: ${res.status} ${res.statusText}`);
        }

        return res.json() as T;
      } catch (error) {
        if (attempt === retries) throw error;
        // Exponential backoff
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
      }
    }

    throw new Error("TMDB fetch failed after retries");
  }

  /**
   * Normalize TMDB status to our enum
   */
  private normalizeStatus(tmdbStatus: string | undefined) {
    if (!tmdbStatus) return "released" as const;

    const statusMap: Record<string, string> = {
      released: "released",
      "post production": "post_production",
      "in production": "in_production",
      planned: "planned",
      rumored: "rumored",
      canceled: "canceled",
      ended: "ended",
      "returning series": "returning",
      pilot: "pilot",
      cancelled: "canceled",
    };

    return (statusMap[tmdbStatus.toLowerCase()] || "released") as any;
  }

  // ==========================================================================
  // Search
  // ==========================================================================

  /**
   * Unified search: searches TMDB and marks which items exist locally
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<PaginatedResult<SearchResult>> {
    const { page = 1, language = "en-US", year, includeAdult = false } = options;

    const searchParams: Record<string, string> = {
      query,
      page: String(page),
      language,
      include_adult: String(includeAdult),
    };
    if (year) searchParams.year = String(year);

    // Search TMDB
    const tmdbData = await this.fetch<{
      results: Array<{
        id: number;
        media_type: "movie" | "tv" | "person";
        title?: string;
        name?: string;
        original_title?: string;
        original_name?: string;
        poster_path?: string | null;
        backdrop_path?: string | null;
        release_date?: string;
        first_air_date?: string;
        vote_average?: number;
        vote_count?: number;
        overview?: string;
      }>;
      page: number;
      total_pages: number;
      total_results: number;
    }>("/search/multi", searchParams);

    // Filter out people, keep only movies and TV
    const mediaResults = tmdbData.results.filter(
      (item) => item.media_type === "movie" || item.media_type === "tv"
    );

    // Get TMDB IDs to check local DB
    const tmdbIds = mediaResults.map((r) => r.id);

    // Check which exist locally
    const localMedia =
      tmdbIds.length > 0
        ? await db
          .select({ id: media.id, tmdbId: media.tmdbId, slug: media.slug })
          .from(media)
          .where(inArray(media.tmdbId, tmdbIds))
        : [];

    const localMap = new Map(localMedia.map((m) => [m.tmdbId, m]));

    // Transform results
    const results: SearchResult[] = mediaResults.map((item) => {
      const isMovie = item.media_type === "movie";
      const title = isMovie ? item.title! : item.name!;
      const local = localMap.get(item.id);
      const localId = local?.id;

      return {
        id: item.id,
        tmdbId: item.id,
        mediaType: isMovie ? "movie" : "series",
        title,
        originalTitle: isMovie ? item.original_title : item.original_name,
        posterPath: item.poster_path
          ? getTmdbImageUrl(item.poster_path, "w500")
          : null,
        backdropPath: item.backdrop_path
          ? getTmdbImageUrl(item.backdrop_path, "w1280")
          : null,
        releaseDate: isMovie ? item.release_date : item.first_air_date,
        voteAverage: item.vote_average,
        voteCount: item.vote_count,
        overview: item.overview,
        isLocal: !!localId,
        localId,
        localSlug: local?.slug,
      };
    });

    return {
      results,
      page: tmdbData.page,
      totalPages: tmdbData.total_pages,
      totalResults: tmdbData.total_results,
    };
  }

  // ==========================================================================
  // Sync Media (Auto-import)
  // ==========================================================================

  /**
   * Sync media from TMDB to local database
   * Creates if not exists, updates if outdated
   */
  async syncMedia(tmdbId: number, type: "movie" | "series") {
    const endpoint = type === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;

    // Fetch full details — append external_ids for TV to get imdb_id
    const data = await this.fetch<TMDBMediaDetails>(endpoint, {
      append_to_response: type === "series" ? "credits,videos,external_ids" : "credits,videos",
      language: "en-US",
    });

    // TV series expose imdb_id via external_ids, not as a top-level field
    if (type === "series" && !data.imdb_id && data.external_ids?.imdb_id) {
      data.imdb_id = data.external_ids.imdb_id;
    }

    // Also fetch English data for original title if different
    let englishTitle: string | undefined;
    if (data.original_language !== "en") {
      try {
        const enData = await this.fetch<TMDBMediaDetails>(endpoint, {
          language: "en-US",
        });
        englishTitle = type === "movie" ? enData.title : enData.name;
      } catch {
        // Ignore if English fetch fails
      }
    }

    return await db.transaction(async (tx) => {
      const title = (type === "movie" ? data.title : data.name) || "Unknown";
      const originalTitle =
        (type === "movie" ? data.original_title : data.original_name) ||
        englishTitle;

      // Generate smart slug - only add year if there's a conflict
      const year = (
        type === "movie" ? data.release_date : data.first_air_date
      )?.split("-")[0];
      const baseSlug = generateSlug(title);

      // Check if base slug is available
      let slug = baseSlug;
      const [existingWithBaseSlug] = await tx
        .select({ id: media.id, tmdbId: media.tmdbId })
        .from(media)
        .where(eq(media.slug, baseSlug))
        .limit(1);

      if (existingWithBaseSlug && existingWithBaseSlug.tmdbId !== data.id) {
        // Slug exists for different media, add year
        slug = year ? `${baseSlug}-${year}` : `${baseSlug}-${data.id}`;

        // Check if slug with year also exists
        const [existingWithYear] = await tx
          .select({ id: media.id })
          .from(media)
          .where(eq(media.slug, slug))
          .limit(1);

        if (existingWithYear) {
          // Both exist, add counter
          let counter = 2;
          while (true) {
            const testSlug = `${baseSlug}-${year || data.id}-${counter}`;
            const [exists] = await tx
              .select({ id: media.id })
              .from(media)
              .where(eq(media.slug, testSlug))
              .limit(1);
            if (!exists) {
              slug = testSlug;
              break;
            }
            counter++;
          }
        }
      }

      const mediaFolder = `${type}s/${slug}`;

      // Process images
      let posterPath: string | null = null;
      let backdropPath: string | null = null;

      if (storageService.isConfigured()) {
        try {
          // Upload poster
          if (data.poster_path) {
            const posterUrl = getTmdbImageUrl(data.poster_path, "original")!;
            const res = await fetch(posterUrl);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              const result = await storageService.uploadPoster(
                buffer,
                mediaFolder
              );
              posterPath = result.path;
            }
          }

          // Upload backdrop
          if (data.backdrop_path) {
            const backdropUrl = getTmdbImageUrl(
              data.backdrop_path,
              "original"
            )!;
            const res = await fetch(backdropUrl);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              const result = await storageService.uploadBackdrop(
                buffer,
                mediaFolder
              );
              backdropPath = result.path;
            }
          }
        } catch (e) {
          logger.error(
            { error: e },
            "Image upload failed, using TMDB fallback"
          );
        }
      }

      // Fallback to TMDB CDN paths if upload failed
      if (!posterPath && data.poster_path) {
        posterPath = `tmdb:${data.poster_path}`;
      }
      if (!backdropPath && data.backdrop_path) {
        backdropPath = `tmdb:${data.backdrop_path}`;
      }

      // Find trailer
      const trailer = data.videos?.results.find(
        (v) => v.site === "YouTube" && v.type === "Trailer"
      );

      // Upsert media
      const [insertedMedia] = await tx
        .insert(media)
        .values({
          tmdbId: data.id,
          imdbId: data.imdb_id,
          slug,
          type,
          title,
          originalTitle,
          tagline: data.tagline,
          overview: data.overview,
          posterPath,
          backdropPath,
          releaseDate:
            (type === "movie" ? data.release_date : data.first_air_date) ||
            null,
          runtime:
            type === "movie" ? data.runtime : data.episode_run_time?.[0] || 0,
          budget: typeof data.budget === "number" ? data.budget : null,
          revenue: typeof data.revenue === "number" ? data.revenue : null,
          popularity: data.popularity,
          voteAverage: data.vote_average,
          voteCount: data.vote_count,
          status: this.normalizeStatus(data.status),
          originalLanguage: data.original_language,
          seasonsCount: data.number_of_seasons,
          episodesCount: data.number_of_episodes,
          homepage: data.homepage,
          trailerUrl: trailer
            ? `https://youtube.com/watch?v=${trailer.key}`
            : null,
        })
        .onConflictDoUpdate({
          target: media.tmdbId,
          set: {
            title, // Update title in case it was wrong
            originalTitle,
            posterPath,
            backdropPath,
            popularity: data.popularity,
            voteAverage: data.vote_average,
            voteCount: data.vote_count,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Sync genres
      if (data.genres?.length > 0) {
        for (const g of data.genres) {
          await tx
            .insert(genres)
            .values({
              tmdbId: g.id,
              name: g.name,
              slug: generateSlug(g.name),
            })
            .onConflictDoNothing();
        }

        const genreIds = data.genres.map((g) => g.id);
        const dbGenres = await tx
          .select()
          .from(genres)
          .where(inArray(genres.tmdbId, genreIds));

        for (const dbGenre of dbGenres) {
          await tx
            .insert(mediaGenres)
            .values({
              mediaId: insertedMedia.id,
              genreId: dbGenre.id,
            })
            .onConflictDoNothing();
        }
      }

      // Sync cast & crew (top 15 cast + key crew)
      const topCast = data.credits?.cast?.slice(0, 15) || [];
      const keyCrew =
        data.credits?.crew
          ?.filter(
            (c) =>
              ["Director", "Writer", "Screenplay", "Creator"].includes(
                c.job || ""
              ) || ["Directing", "Writing"].includes(c.department || "")
          )
          .slice(0, 10) || [];

      const allPeople = [...topCast, ...keyCrew];

      logger.info(
        {
          tmdbId,
          castCount: topCast.length,
          crewCount: keyCrew.length,
          totalPeople: allPeople.length,
          hasCredits: !!data.credits,
        },
        "Syncing cast & crew"
      );

      for (const p of allPeople) {
        // For now, use TMDB URLs for profile photos to avoid timeout
        // TODO: Implement async background job for uploading to B2
        const profilePath = p.profile_path ? `tmdb:${p.profile_path}` : null;

        const [insertedPerson] = await tx
          .insert(people)
          .values({
            tmdbId: p.id,
            name: p.name,
            slug: `${generateSlug(p.name)}-${p.id}`,
            profilePath,
            gender:
              p.gender === 1 ? "female" : p.gender === 2 ? "male" : "unknown",
            knownForDepartment: p.known_for_department,
            popularity: p.popularity || 0,
          })
          .onConflictDoUpdate({
            target: people.tmdbId,
            set: {
              popularity: p.popularity || 0,
              name: p.name,
              profilePath,
            },
          })
          .returning();

        await tx
          .insert(mediaCredits)
          .values({
            mediaId: insertedMedia.id,
            personId: insertedPerson.id,
            creditType: data.credits.cast.some((c) => c.id === p.id)
              ? "cast"
              : "crew",
            character: p.character,
            department: p.department,
            job: p.job,
            castOrder: p.order,
          })
          .onConflictDoNothing();
      }

      logger.info(
        { tmdbId, title, mediaId: insertedMedia.id },
        "Media synced successfully"
      );

      return insertedMedia;
    });
  }

  // ==========================================================================
  // Discover & Trending
  // ==========================================================================

  /**
   * Get trending media
   */
  async getTrending(
    timeWindow: "day" | "week" = "week",
    type: "movie" | "tv" | "all" = "all",
    page = 1
  ): Promise<PaginatedResult<SearchResult>> {
    const endpoint = `/trending/${type}/${timeWindow}`;

    const data = await this.fetch<{
      results: Array<{
        id: number;
        media_type?: "movie" | "tv";
        title?: string;
        name?: string;
        poster_path?: string | null;
        backdrop_path?: string | null;
        release_date?: string;
        first_air_date?: string;
        vote_average?: number;
        overview?: string;
      }>;
      page: number;
      total_pages: number;
      total_results: number;
    }>(endpoint, { page: String(page) });

    const results: SearchResult[] = data.results.map((item) => {
      const isMovie = item.media_type === "movie" || !!item.title;
      return {
        id: item.id,
        tmdbId: item.id,
        mediaType: isMovie ? "movie" : "series",
        title: isMovie ? item.title! : item.name!,
        posterPath: getTmdbImageUrl(item.poster_path, "w500"),
        backdropPath: getTmdbImageUrl(item.backdrop_path, "w1280"),
        releaseDate: isMovie ? item.release_date : item.first_air_date,
        voteAverage: item.vote_average,
        overview: item.overview,
        isLocal: false,
      };
    });

    return {
      results,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    };
  }

  /**
   * Get upcoming movies
   */
  async getUpcoming(page = 1): Promise<PaginatedResult<SearchResult>> {
    const data = await this.fetch<{
      results: Array<{
        id: number;
        title: string;
        poster_path?: string | null;
        backdrop_path?: string | null;
        release_date?: string;
        vote_average?: number;
        overview?: string;
      }>;
      page: number;
      total_pages: number;
      total_results: number;
    }>("/movie/upcoming", { page: String(page) });

    const results: SearchResult[] = data.results.map((item) => ({
      id: item.id,
      tmdbId: item.id,
      mediaType: "movie",
      title: item.title,
      posterPath: getTmdbImageUrl(item.poster_path, "w500"),
      backdropPath: getTmdbImageUrl(item.backdrop_path, "w1280"),
      releaseDate: item.release_date,
      voteAverage: item.vote_average,
      overview: item.overview,
      isLocal: false,
    }));

    return {
      results,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    };
  }


  // ==========================================================================
  // Detailed Info (Public)
  // ==========================================================================

  /**
   * Get media details from TMDB
   * Public method to fetch full details with credits
   */
  async getMediaDetails(
    tmdbId: number,
    type: "movie" | "series",
    language = "en-US"
  ): Promise<TMDBMediaDetails> {
    const mediaType = type === "movie" ? "movie" : "tv";
    const endpoint = `/${mediaType}/${tmdbId}`;

    const data = await this.fetch<TMDBMediaDetails>(endpoint, {
      append_to_response: type === "series" ? "credits,videos,external_ids" : "credits,videos",
      language,
    });

    // TV series expose imdb_id via external_ids, not as a top-level field
    if (type === "series" && !data.imdb_id && data.external_ids?.imdb_id) {
      data.imdb_id = data.external_ids.imdb_id;
    }

    return data;
  }

  async getSeriesDetails(tmdbId: number) {
    return this.fetch<any>(`/tv/${tmdbId}`, {
      append_to_response: "seasons",
      language: "en-US",
    });
  }

  async getSeasonDetails(tmdbId: number, seasonNumber: number) {
    return this.fetch<any>(`/tv/${tmdbId}/season/${seasonNumber}`, {
      language: "en-US",
    });
  }

  // ==========================================================================
  // Extended Discovery & Lists
  // ==========================================================================

  /**
   * Discover movies or TV shows
   */
  async discover(options: {
    type: "movie" | "series";
    genre?: number;
    year?: number;
    sortBy?:
    | "popularity"
    | "rating"
    | "release_date"
    | "revenue"
    | "vote_count";
    page?: number;
    language?: string;
    minVotes?: number;
  }): Promise<PaginatedResult<SearchResult>> {
    const {
      type,
      genre,
      year,
      sortBy = "popularity",
      page = 1,
      language = "en-US",
      minVotes = 100,
    } = options;

    const sortMapping: Record<string, string> = {
      popularity: "popularity.desc",
      rating: "vote_average.desc",
      release_date:
        type === "movie" ? "release_date.desc" : "first_air_date.desc",
      revenue: "revenue.desc",
      vote_count: "vote_count.desc",
    };

    const endpoint = type === "movie" ? "/discover/movie" : "/discover/tv";

    const params: Record<string, string> = {
      page: String(page),
      language,
      sort_by: sortMapping[sortBy],
      "vote_count.gte": String(minVotes),
    };

    if (genre) params.with_genres = String(genre);
    if (year) {
      if (type === "movie") {
        params.primary_release_year = String(year);
      } else {
        params.first_air_date_year = String(year);
      }
    }

    const data = await this.fetch<{
      results: Array<{
        id: number;
        title?: string;
        name?: string;
        original_title?: string;
        original_name?: string;
        poster_path?: string | null;
        backdrop_path?: string | null;
        release_date?: string;
        first_air_date?: string;
        vote_average?: number;
        overview?: string;
      }>;
      page: number;
      total_pages: number;
      total_results: number;
    }>(endpoint, params);

    const results: SearchResult[] = data.results.map((item) => ({
      id: item.id,
      tmdbId: item.id,
      mediaType: type,
      title: type === "movie" ? item.title! : item.name!,
      originalTitle:
        type === "movie" ? item.original_title : item.original_name,
      posterPath: getTmdbImageUrl(item.poster_path, "w500"),
      backdropPath: getTmdbImageUrl(item.backdrop_path, "w1280"),
      releaseDate: type === "movie" ? item.release_date : item.first_air_date,
      voteAverage: item.vote_average,
      overview: item.overview,
      isLocal: false,
    }));

    return {
      results,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    };
  }

  /**
   * Get popular movies or TV shows
   */
  async getPopular(
    type: "movie" | "series",
    page = 1,
    language = "en-US"
  ): Promise<PaginatedResult<SearchResult>> {
    const endpoint = type === "movie" ? "/movie/popular" : "/tv/popular";

    const data = await this.fetch<{
      results: Array<{
        id: number;
        title?: string;
        name?: string;
        poster_path?: string | null;
        backdrop_path?: string | null;
        release_date?: string;
        first_air_date?: string;
        vote_average?: number;
        overview?: string;
      }>;
      page: number;
      total_pages: number;
      total_results: number;
    }>(endpoint, { page: String(page), language });

    const results: SearchResult[] = data.results.map((item) => ({
      id: item.id,
      tmdbId: item.id,
      mediaType: type,
      title: type === "movie" ? item.title! : item.name!,
      posterPath: getTmdbImageUrl(item.poster_path, "w500"),
      backdropPath: getTmdbImageUrl(item.backdrop_path, "w1280"),
      releaseDate: type === "movie" ? item.release_date : item.first_air_date,
      voteAverage: item.vote_average,
      overview: item.overview,
      isLocal: false,
    }));

    return {
      results,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    };
  }

  /**
   * Get top rated movies or TV shows
   */
  async getTopRated(
    type: "movie" | "series",
    page = 1,
    language = "en-US"
  ): Promise<PaginatedResult<SearchResult>> {
    const endpoint = type === "movie" ? "/movie/top_rated" : "/tv/top_rated";

    const data = await this.fetch<{
      results: Array<{
        id: number;
        title?: string;
        name?: string;
        poster_path?: string | null;
        backdrop_path?: string | null;
        release_date?: string;
        first_air_date?: string;
        vote_average?: number;
        overview?: string;
      }>;
      page: number;
      total_pages: number;
      total_results: number;
    }>(endpoint, { page: String(page), language });

    const results: SearchResult[] = data.results.map((item) => ({
      id: item.id,
      tmdbId: item.id,
      mediaType: type,
      title: type === "movie" ? item.title! : item.name!,
      posterPath: getTmdbImageUrl(item.poster_path, "w500"),
      backdropPath: getTmdbImageUrl(item.backdrop_path, "w1280"),
      releaseDate: type === "movie" ? item.release_date : item.first_air_date,
      voteAverage: item.vote_average,
      overview: item.overview,
      isLocal: false,
    }));

    return {
      results,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    };
  }

  /**
   * Get recommendations for a media item
   */
  async getRecommendations(
    tmdbId: number,
    type: "movie" | "series",
    page = 1,
    language = "en-US"
  ): Promise<PaginatedResult<SearchResult>> {
    const mediaType = type === "movie" ? "movie" : "tv";
    const endpoint = `/${mediaType}/${tmdbId}/recommendations`;

    const data = await this.fetch<{
      results: Array<{
        id: number;
        title?: string;
        name?: string;
        poster_path?: string | null;
        backdrop_path?: string | null;
        release_date?: string;
        first_air_date?: string;
        vote_average?: number;
        overview?: string;
      }>;
      page: number;
      total_pages: number;
      total_results: number;
    }>(endpoint, { page: String(page), language });

    const tmdbIds = data.results.map((r) => r.id);
    const localMedia = tmdbIds.length > 0
      ? await db.select({ id: media.id, tmdbId: media.tmdbId, slug: media.slug }).from(media).where(inArray(media.tmdbId, tmdbIds))
      : [];
    const localMap = new Map(localMedia.map((m) => [m.tmdbId, m]));

    const results: SearchResult[] = data.results.map((item) => {
      const local = localMap.get(item.id);
      return {
        id: item.id,
        tmdbId: item.id,
        mediaType: type,
        title: type === "movie" ? item.title! : item.name!,
        posterPath: getTmdbImageUrl(item.poster_path, "w500"),
        backdropPath: getTmdbImageUrl(item.backdrop_path, "w1280"),
        releaseDate: type === "movie" ? item.release_date : item.first_air_date,
        voteAverage: item.vote_average,
        overview: item.overview,
        isLocal: !!local,
        localId: local?.id,
        localSlug: local?.slug,
      };
    });

    return {
      results,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    };
  }

  /**
   * Get similar media
   */
  async getSimilar(
    tmdbId: number,
    type: "movie" | "series",
    page = 1,
    language = "en-US"
  ): Promise<PaginatedResult<SearchResult>> {
    const mediaType = type === "movie" ? "movie" : "tv";
    const endpoint = `/${mediaType}/${tmdbId}/similar`;

    const data = await this.fetch<{
      results: Array<{
        id: number;
        title?: string;
        name?: string;
        poster_path?: string | null;
        backdrop_path?: string | null;
        release_date?: string;
        first_air_date?: string;
        vote_average?: number;
        overview?: string;
      }>;
      page: number;
      total_pages: number;
      total_results: number;
    }>(endpoint, { page: String(page), language });

    const tmdbIds = data.results.map((r) => r.id);
    const localMedia = tmdbIds.length > 0
      ? await db.select({ id: media.id, tmdbId: media.tmdbId, slug: media.slug }).from(media).where(inArray(media.tmdbId, tmdbIds))
      : [];
    const localMap = new Map(localMedia.map((m) => [m.tmdbId, m]));

    const results: SearchResult[] = data.results.map((item) => {
      const local = localMap.get(item.id);
      return {
        id: item.id,
        tmdbId: item.id,
        mediaType: type,
        title: type === "movie" ? item.title! : item.name!,
        posterPath: getTmdbImageUrl(item.poster_path, "w500"),
        backdropPath: getTmdbImageUrl(item.backdrop_path, "w1280"),
        releaseDate: type === "movie" ? item.release_date : item.first_air_date,
        voteAverage: item.vote_average,
        overview: item.overview,
        isLocal: !!local,
        localId: local?.id,
        localSlug: local?.slug,
      };
    });

    return {
      results,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    };
  }

  // Alias for backward compatibility / clarity
  async importMedia(tmdbId: number, type: "movie" | "series") {
    return this.syncMedia(tmdbId, type);
  }
}

export const tmdbService = new TMDBService();
