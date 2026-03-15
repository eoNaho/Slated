export interface OmdbRating {
  Source: string;
  Value: string;
}

export interface OmdbMovieResponse {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: OmdbRating[];
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD: string;
  BoxOffice: string;
  Production: string;
  Website: string;
  Response: string;
  Error?: string;
}

export class OmdbService {
  private apiKey: string;
  private baseUrl = "http://www.omdbapi.com/";

  constructor() {
    this.apiKey = process.env.OMDB_API_KEY || "";
    if (!this.apiKey) {
      console.warn("⚠️ OMDB_API_KEY is not set. fetching ratings will fail.");
    }
  }

  async getMovieByImdbId(imdbId: string): Promise<OmdbMovieResponse | null> {
    if (!this.apiKey || !imdbId) return null;

    try {
      const response = await fetch(
        `${this.baseUrl}?apikey=${this.apiKey}&i=${imdbId}`
      );
      const data: OmdbMovieResponse = await response.json();

      if (data.Response === "False") {
        console.error(`OMDB Error for ${imdbId}:`, data.Error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Failed to fetch from OMDB:", error);
      return null;
    }
  }

  // Helper to normalize ratings into a standard object
  normalizeRatings(data: OmdbMovieResponse | null) {
    if (!data) return null;

    return {
      imdb: {
        rating: data.imdbRating !== "N/A" ? parseFloat(data.imdbRating) : null,
        votes:
          data.imdbVotes !== "N/A"
            ? parseInt(data.imdbVotes.replace(/,/g, ""))
            : null,
      },
      metacritic: data.Metascore !== "N/A" ? parseInt(data.Metascore) : null,
      rottenTomatoes: this.findRatingValue(data.Ratings, "Rotten Tomatoes"),
    };
  }

  private findRatingValue(
    ratings: OmdbRating[],
    source: string
  ): number | null {
    const rating = ratings.find((r) => r.Source === source);
    if (!rating) return null;

    // Parse "85%" to 85
    const value = parseInt(rating.Value.replace("%", ""));
    return isNaN(value) ? null : value;
  }
}

export const omdbService = new OmdbService();
