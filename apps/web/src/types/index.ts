/**
 * Shared types for PixelReel
 * Used across frontend and API
 */

// ==================== USER ====================

export interface User {
  id: string;
  username: string;
  displayName?: string | null;
  email?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  location?: string | null;
  website?: string | null;
  isVerified: boolean;
  isPremium: boolean;
  role: "user" | "moderator" | "admin";
  status: "active" | "suspended" | "banned";
  createdAt: string;
  lastActiveAt?: string | null;
}

export interface UserStats {
  userId: string;
  moviesWatched: number;
  seriesWatched: number;
  watchTimeMins: number;
  reviewsCount: number;
  listsCount: number;
  followersCount: number;
  followingCount: number;
  xp: number;
  level: number;
  thisYearCount?: number; // Films watched this year
  averageRating?: number; // User's average rating
}

// Extended profile with stats included (for profile pages)
export interface UserProfile extends User {
  stats: UserStats;
}

// ==================== MEDIA ====================

export interface Media {
  id: string;
  tmdbId: number;
  imdbId?: string | null;
  slug?: string; // URL-friendly identifier
  type: "movie" | "series";
  title: string;
  originalTitle?: string | null;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  year?: number; // Convenience field extracted from releaseDate
  runtime?: number | null;
  status?: string | null;
  popularity?: number | null;
  voteAverage?: number | null;
  voteCount?: number | null;
  budget?: number | null;
  revenue?: number | null;
  tagline?: string | null;
  trailerUrl?: string | null;
  genres?: (Genre | string)[];
  createdAt?: string;
}

export interface MediaDetails extends Media {
  genres: Genre[];
  credits: Credit[];
  streaming: StreamingService[];
  externalRatings?: ExternalRating[];
}

export interface Genre {
  id: string;
  tmdbId: number;
  name: string;
}

export interface Credit {
  id: string;
  personId: string;
  mediaId: string;
  creditType: "cast" | "crew";
  character?: string | null;
  castOrder?: number | null;
  department?: string | null;
  job?: string | null;
  person: Person;
}

export interface Person {
  id: string;
  tmdbId: number;
  name: string;
  profilePath?: string | null;
  knownFor?: string | null;
}

export interface StreamingService {
  id: string;
  name: string;
  logoPath?: string | null;
}

export interface ExternalRating {
  source: string;
  value: string;
}

// ==================== DISCOVERY & ENRICHED DATA ====================

export interface SearchOptions {
  page?: number;
  language?: string;
  year?: number;
  includeAdult?: boolean;
  type?: "movie" | "series";
  genre?: number;
  sortBy?: "popularity" | "rating" | "release_date" | "revenue" | "vote_count";
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
  overview?: string;
  isLocal: boolean;
  localId?: string;
  localSlug?: string;
}

export interface EnrichedMediaData {
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
  status: string;
  originalLanguage: string;
  seasonsCount?: number;
  episodesCount?: number;
  trailerUrl?: string;

  tmdb: {
    rating: number;
    votes: number;
    popularity: number;
  };

  ratings: {
    imdb?: { rating: string; votes: string };
    metacritic?: string;
    rottenTomatoes?: string;
  };

  credits: {
    cast: {
      id: number;
      name: string;
      character?: string;
      profilePath?: string | null;
      order?: number;
    }[];
    crew: {
      id: number;
      name: string;
      job?: string;
      department?: string;
      profilePath?: string | null;
    }[];
  };

  genres: { id: number; name: string }[];

  omdbData?: {
    rated?: string;
    awards?: string;
    boxOffice?: string;
    director?: string;
    writers?: string[];
    actors?: string[];
  };
}

// Favorite film for profile (simplified media)
export interface FavoriteFilm {
  id: string;
  title: string;
  posterPath: string;
  year: number;
}

// ==================== REVIEWS ====================

export interface Review {
  id: string;
  userId: string;
  mediaId: string;
  title?: string | null;
  content: string;
  rating?: number | null;
  containsSpoilers: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
  media?: Media;
}

export interface CreateReviewInput {
  mediaId: string;
  content: string;
  rating?: number;
  title?: string;
  containsSpoilers?: boolean;
}

// ==================== LISTS ====================

export interface List {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  coverImages?: string[]; // Multiple cover images for display
  isPublic: boolean;
  isRanked: boolean;
  category?: string | null;
  likesCount: number;
  itemsCount: number;
  viewsCount: number;
  createdAt: string;
  user?: User;
}

export interface ListDetails extends List {
  items: ListItem[];
}

export interface ListItem {
  id: string;
  listId: string;
  mediaId: string;
  position: number;
  note?: string | null;
  media: Media;
}

export interface CreateListInput {
  name: string;
  description?: string;
  isPublic?: boolean;
  isRanked?: boolean;
  category?: string;
}

// ==================== WATCHLIST ====================

export interface WatchlistItem {
  id: string;
  userId: string;
  mediaId: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  addedAt?: string; // Alias for createdAt
  media: Media;
}

// ==================== DIARY ====================

export interface DiaryEntry {
  id: string;
  userId: string;
  mediaId: string;
  reviewId?: string | null;
  watchedAt: string;
  rating?: number | null;
  isRewatch: boolean;
  notes?: string | null;
  createdAt: string;
  media?: Media;
  review?: Review;
}

// ==================== LIKES ====================

export interface LikeItem {
  id: string;
  userId: string;
  mediaId: string;
  likedAt: string;
  createdAt?: string;
  media: Media;
}

// ==================== ACTIVITY ====================

export interface Activity {
  id: string;
  userId: string;
  type: "watch" | "review" | "list" | "follow" | "like" | "achievement";
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: User;
  // For activity feed display
  data?: {
    title?: string;
    posterPath?: string;
    rating?: number;
    content?: string;
    username?: string;
  };
}

// ==================== NOTIFICATIONS ====================

export interface Notification {
  id: string;
  userId: string;
  type: "follow" | "like" | "comment" | "achievement" | "system";
  title: string;
  message?: string | null;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

// ==================== ACHIEVEMENTS ====================

export interface Achievement {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  xpReward: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  achievement?: Achievement;
}

// ==================== PLANS & SUBSCRIPTIONS ====================

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: Record<string, unknown>;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  stripeSubscriptionId?: string | null;
  status: "active" | "canceled" | "past_due" | "unpaid";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan?: Plan;
}

// ==================== API RESPONSES ====================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchResults {
  media: Media[];
  users: User[];
  lists: List[];
}

// ==================== API ERROR ====================

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
