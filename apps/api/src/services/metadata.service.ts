/**
 * Unified Metadata Service
 * Combines TMDB (primary source) + OMDb (ratings) for complete media data
 * Similar to Letterboxd's approach of aggregating multiple sources
 */

import { logger } from "../utils/logger";
import { tmdbService } from "./tmdb";
import { omdbService } from "./omdb";

// ============================================================================
// Types
// ============================================================================

export interface EnrichedMediaData {
    // TMDB Core Data
    tmdbId: number;
    imdbId?: string;
    type: "movie" | "series";
    title: string;
    originalTitle?: string;
    tagline?: string;
    overview?: string;
    posterPath?: string | null;
    backdropPath?: string | null;
    releaseDate?: string;
    runtime?: number;
    budget?: number;
    revenue?: number;
    homepage?: string;
    trailerUrl?: string;
    status: string;
    originalLanguage: string;

    // Series specific
    seasonsCount?: number;
    episodesCount?: number;

    // TMDB Ratings
    tmdb: {
        rating: number;
        votes: number;
        popularity: number;
    };

    // External Ratings (from OMDb)
    ratings: {
        imdb?: {
            rating: number;
            votes: number;
        };
        metacritic?: number;
        rottenTomatoes?: number;
    };

    // Additional OMDb Data
    omdbData?: {
        rated?: string; // PG-13, R, etc
        awards?: string;
        boxOffice?: string;
        director?: string;
        writers?: string[];
        actors?: string[];
    };

    // TMDB Credits
    credits: {
        cast: Array<{
            id: number;
            name: string;
            character?: string;
            profilePath?: string | null;
            order?: number;
        }>;
        crew: Array<{
            id: number;
            name: string;
            job?: string;
            department?: string;
            profilePath?: string | null;
        }>;
    };

    // Genres
    genres: Array<{
        id: number;
        name: string;
    }>;
}

export interface SearchResultEnriched {
    id: number;
    tmdbId: number;
    mediaType: "movie" | "series";
    title: string;
    originalTitle?: string;
    posterPath?: string | null;
    backdropPath?: string | null;
    releaseDate?: string;
    overview?: string;

    // Rating preview (TMDB only for search results)
    voteAverage: number;
    voteCount: number;

    // Local DB status
    isLocal: boolean;
    localId?: string;
    localSlug?: string;
}

// ============================================================================
// Metadata Service
// ============================================================================

export class MetadataService {
    /**
     * Search for media with enriched data
     */
    async search(
        query: string,
        options: {
            page?: number;
            language?: string;
            year?: number;
            type?: "movie" | "series" | "all";
        } = {}
    ) {
        const { page = 1, language = "en-US", year, type = "all" } = options;

        // Search TMDB
        const tmdbResults = await tmdbService.search(query, {
            page,
            language,
            year,
        });

        // Filter by type if specified
        let filteredResults = tmdbResults.results;
        if (type !== "all") {
            filteredResults = filteredResults.filter((r) => r.mediaType === type);
        }

        const enriched: SearchResultEnriched[] = filteredResults.map((result) => ({
            id: result.id,
            tmdbId: result.tmdbId,
            mediaType: result.mediaType,
            title: result.title,
            originalTitle: result.originalTitle,
            posterPath: result.posterPath,
            backdropPath: result.backdropPath,
            releaseDate: result.releaseDate,
            overview: result.overview,
            voteAverage: result.voteAverage || 0,
            voteCount: result.voteCount || 0,
            isLocal: result.isLocal,
            localId: result.localId,
            localSlug: result.localSlug,
        }));

        return {
            results: enriched,
            page: tmdbResults.page,
            totalPages: tmdbResults.totalPages,
            totalResults: tmdbResults.totalResults,
        };
    }

    /**
     * Get complete enriched metadata for a specific media
     * Combines TMDB + OMDb data
     */
    async getEnrichedMetadata(
        tmdbId: number,
        type: "movie" | "series"
    ): Promise<EnrichedMediaData> {
        logger.info({ tmdbId, type }, "Fetching enriched metadata");

        // Get TMDB data (with credits and videos)
        const tmdbData = await tmdbService.getMediaDetails(tmdbId, type);

        // Initialize enriched data with TMDB info
        const enriched: EnrichedMediaData = {
            tmdbId: tmdbData.id,
            imdbId: tmdbData.imdb_id,
            type,
            title: type === "movie" ? tmdbData.title! : tmdbData.name!,
            originalTitle:
                type === "movie" ? tmdbData.original_title : tmdbData.original_name,
            tagline: tmdbData.tagline,
            overview: tmdbData.overview,
            posterPath: tmdbData.poster_path,
            backdropPath: tmdbData.backdrop_path,
            releaseDate:
                type === "movie" ? tmdbData.release_date : tmdbData.first_air_date,
            runtime:
                type === "movie"
                    ? tmdbData.runtime
                    : tmdbData.episode_run_time?.[0] || 0,
            budget: tmdbData.budget,
            revenue: tmdbData.revenue,
            homepage: tmdbData.homepage,
            status: tmdbData.status,
            originalLanguage: tmdbData.original_language,
            seasonsCount: tmdbData.number_of_seasons,
            episodesCount: tmdbData.number_of_episodes,

            // TMDB ratings
            tmdb: {
                rating: tmdbData.vote_average,
                votes: tmdbData.vote_count,
                popularity: tmdbData.popularity,
            },

            // Initialize empty ratings
            ratings: {},

            // Credits
            credits: {
                cast:
                    tmdbData.credits?.cast?.slice(0, 15).map((c) => ({
                        id: c.id,
                        name: c.name,
                        character: c.character,
                        profilePath: c.profile_path,
                        order: c.order,
                    })) || [],
                crew:
                    tmdbData.credits?.crew
                        ?.filter(
                            (c) =>
                                ["Director", "Writer", "Screenplay", "Creator"].includes(
                                    c.job || ""
                                ) || ["Directing", "Writing"].includes(c.department || "")
                        )
                        .slice(0, 10)
                        .map((c) => ({
                            id: c.id,
                            name: c.name,
                            job: c.job,
                            department: c.department,
                            profilePath: c.profile_path,
                        })) || [],
            },

            // Genres
            genres: tmdbData.genres || [],
        };

        // Find trailer
        const trailer = tmdbData.videos?.results.find(
            (v) => v.site === "YouTube" && v.type === "Trailer"
        );
        if (trailer) {
            enriched.trailerUrl = `https://youtube.com/watch?v=${trailer.key}`;
        }

        // Fetch OMDb data if we have IMDb ID
        if (enriched.imdbId) {
            try {
                const omdbData = await omdbService.getMovieByImdbId(enriched.imdbId);

                if (omdbData) {
                    const normalizedRatings = omdbService.normalizeRatings(omdbData);

                    // Add external ratings
                    if (normalizedRatings) {
                        enriched.ratings = {
                            imdb: normalizedRatings.imdb.rating
                                ? {
                                    rating: normalizedRatings.imdb.rating,
                                    votes: normalizedRatings.imdb.votes || 0,
                                }
                                : undefined,
                            metacritic: normalizedRatings.metacritic || undefined,
                            rottenTomatoes: normalizedRatings.rottenTomatoes || undefined,
                        };
                    }

                    // Add additional OMDb data
                    enriched.omdbData = {
                        rated: omdbData.Rated !== "N/A" ? omdbData.Rated : undefined,
                        awards: omdbData.Awards !== "N/A" ? omdbData.Awards : undefined,
                        boxOffice:
                            omdbData.BoxOffice !== "N/A" ? omdbData.BoxOffice : undefined,
                        director:
                            omdbData.Director !== "N/A" ? omdbData.Director : undefined,
                        writers:
                            omdbData.Writer !== "N/A"
                                ? omdbData.Writer.split(",").map((w) => w.trim())
                                : undefined,
                        actors:
                            omdbData.Actors !== "N/A"
                                ? omdbData.Actors.split(",").map((a) => a.trim())
                                : undefined,
                    };

                    logger.info(
                        { tmdbId, imdbId: enriched.imdbId },
                        "Successfully enriched with OMDb data"
                    );
                }
            } catch (error) {
                logger.warn(
                    { error, tmdbId, imdbId: enriched.imdbId },
                    "Failed to fetch OMDb data, continuing with TMDB only"
                );
            }
        }

        return enriched;
    }

    /**
     * Discover media with filters (Letterboxd-style discovery)
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
    }) {
        const {
            type,
            genre,
            year,
            sortBy = "popularity",
            page = 1,
            language = "en-US",
        } = options;

        return await tmdbService.discover({
            type,
            genre,
            year,
            sortBy,
            page,
            language,
        });
    }

    /**
     * Get trending media (daily/weekly)
     */
    async getTrending(
        timeWindow: "day" | "week" = "week",
        type: "movie" | "series" | "all" = "all",
        page = 1
    ) {
        const tmdbType = type === "series" ? "tv" : type;
        return tmdbService.getTrending(timeWindow, tmdbType, page);
    }

    /**
     * Get popular media
     */
    async getPopular(type: "movie" | "series" = "movie", page = 1) {
        return await tmdbService.getPopular(type, page);
    }

    /**
     * Get top rated media
     */
    async getTopRated(type: "movie" | "series" = "movie", page = 1) {
        return await tmdbService.getTopRated(type, page);
    }

    /**
     * Get upcoming movies
     */
    async getUpcoming(page = 1) {
        return tmdbService.getUpcoming(page);
    }

    /**
     * Get recommendations based on a media item
     */
    async getRecommendations(
        tmdbId: number,
        type: "movie" | "series",
        page = 1
    ) {
        return await tmdbService.getRecommendations(tmdbId, type, page);
    }

    /**
     * Get similar media
     */
    async getSimilar(tmdbId: number, type: "movie" | "series", page = 1) {
        return await tmdbService.getSimilar(tmdbId, type, page);
    }
}

export const metadataService = new MetadataService();
