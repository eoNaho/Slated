/**
 * Typed API Client for PixelReel
 */

import type {
  MediaDetails,
  User,
  UserStats,
  Review,
  CreateReviewInput,
  List,
  ListDetails,
  CreateListInput,
  WatchlistItem,
  DiaryEntry,
  Activity,
  Notification,
  Plan,
  PaginatedResponse,
  SearchResult,
  EnrichedMediaData,
  SearchOptions,
  Comment,
  Achievement,
  XpActivity,
  LeaderboardEntry,
  Scrobble,
  ClubInvite,
  MediaGalleryData,
} from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetcher<T>(
  endpoint: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { token: _token, ...init } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...init.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(error.error || "Request failed", res.status, error.code);
  }

  return res.json();
}

// ==================== AUTH ====================

export const authApi = {
  getGoogleUrl: () => `${API_URL}/auth/google`,
  getAppleUrl: () => `${API_URL}/auth/apple`,

  forgotPassword: (email: string) =>
    fetcher<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    fetcher<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),

  verifyEmail: (token: string) =>
    fetcher<{ message: string }>(`/auth/verify?token=${token}`),

  resendVerification: () =>
    fetcher<{ message: string }>("/auth/resend-verification", {
      method: "POST",
    }),
};

// ==================== USERS ====================

export const usersApi = {
  getMe: () => fetcher<User>("/users/me"),

  getByUsername: (username: string) => fetcher<User>(`/users/${username}`),

  getStats: (username: string) =>
    fetcher<UserStats>(`/users/${username}/stats`),

  update: (data: Partial<User>) =>
    fetcher<User>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  follow: (userId: string) =>
    fetcher<{ message: string }>(`/users/${userId}/follow`, {
      method: "POST",
    }),

  unfollow: (userId: string) =>
    fetcher<{ message: string }>(`/users/${userId}/follow`, {
      method: "DELETE",
    }),

  getFollowers: (username: string, page = 1) =>
    fetcher<PaginatedResponse<User>>(
      `/users/${username}/followers?page=${page}`
    ),

  getFollowing: (username: string, page = 1) =>
    fetcher<PaginatedResponse<User>>(
      `/users/${username}/following?page=${page}`
    ),

  search: (q: string) =>
    fetcher<{ data: Pick<User, "id" | "username" | "displayName" | "avatarUrl">[] }>(
      `/users/search?q=${encodeURIComponent(q)}`
    ),
};

// ==================== MEDIA ====================

export const mediaApi = {
  // Enhanced Search (POST with filters)
  search: (
    query: string,
    options: Omit<SearchOptions, "page"> = {},
    page = 1
  ) => {
    return fetcher<{ results: SearchResult[]; page: number; totalPages: number; total: number; hasNext: boolean; hasPrev: boolean }>(
      "/media/search",
      {
        method: "POST",
        body: JSON.stringify({
          query: query.trim(),
          page,
          ...Object.fromEntries(
            Object.entries(options).filter(([, v]) => v !== "" && v !== undefined && v !== null)
          ),
        }),
      }
    );
  },

  // Discovery (Browse with filters)
  discover: (options: SearchOptions = {}) => {
    const params = new URLSearchParams();
    if (options.page) params.set("page", String(options.page));
    if (options.type) params.set("type", options.type);
    if (options.genre) params.set("genre", String(options.genre));
    if (options.year) params.set("year", String(options.year));
    if (options.sortBy) params.set("sortBy", options.sortBy);
    if (options.language) params.set("language", options.language);

    return fetcher<{ data: SearchResult[]; page: number; totalPages: number; total: number; hasNext: boolean; hasPrev: boolean }>(
      `/media/discover?${params}`
    );
  },

  // Quick Preview (Enriched Data without Import)
  preview: (tmdbId: number, type: "movie" | "series") => {
    return fetcher<{ data: EnrichedMediaData }>(
      `/media/tmdb/${tmdbId}/preview?type=${type}`
    );
  },

  getTrending: (
    timeWindow: "day" | "week" = "week",
    type: "all" | "movie" | "series" = "all",
    page = 1
  ) => {
    return fetcher<{ data: SearchResult[]; page: number; totalPages: number; total: number; hasNext: boolean; hasPrev: boolean }>(
      `/media/trending?timeWindow=${timeWindow}&type=${type}&page=${page}`
    );
  },

  getPopular: (type: "movie" | "series" = "movie", page = 1) => {
    return fetcher<{ data: SearchResult[]; page: number; totalPages: number; total: number; hasNext: boolean; hasPrev: boolean }>(
      `/media/popular?type=${type}&page=${page}`
    );
  },

  getTopRated: (type: "movie" | "series" = "movie", page = 1) => {
    return fetcher<{ data: SearchResult[]; page: number; totalPages: number; total: number; hasNext: boolean; hasPrev: boolean }>(
      `/media/top-rated?type=${type}&page=${page}`
    );
  },

  getUpcoming: (page = 1) => {
    return fetcher<{ data: SearchResult[]; page: number; totalPages: number; total: number; hasNext: boolean; hasPrev: boolean }>(
      `/media/upcoming?page=${page}`
    );
  },

  getRecommendations: (tmdbId: number, type: "movie" | "series", page = 1) => {
    return fetcher<{ data: SearchResult[]; page: number; totalPages: number; total: number; hasNext: boolean; hasPrev: boolean }>(
      `/media/tmdb/${tmdbId}/recommendations?type=${type}&page=${page}`
    );
  },

  getSimilar: (tmdbId: number, type: "movie" | "series", page = 1) => {
    return fetcher<{ data: SearchResult[]; page: number; totalPages: number; total: number; hasNext: boolean; hasPrev: boolean }>(
      `/media/tmdb/${tmdbId}/similar?type=${type}&page=${page}`
    );
  },

  getGallery: (mediaId: string) =>
    fetcher<{ data: MediaGalleryData }>(`/media/${mediaId}/gallery`),

  setCustomCoverFromGallery: (mediaId: string, filePath: string) =>
    fetcher<{ data: { id: string; imageUrl: string } }>(`/media/${mediaId}/custom-cover/from-gallery`, {
      method: "POST",
      body: JSON.stringify({ filePath }),
    }),

  deleteCustomCover: (mediaId: string) =>
    fetcher<{ data: { deleted: boolean } }>(`/media/${mediaId}/custom-cover`, {
      method: "DELETE",
    }),

  // Legacy / Local access
  getById: (id: string) => fetcher<{ data: MediaDetails }>(`/media/${id}`),

  getBySlug: (slug: string) =>
    fetcher<{ data: MediaDetails }>(`/media/slug/${slug}`),

  getState: (id: string) =>
    fetcher<{ data: { liked: boolean; watched: boolean; inWatchlist: boolean; rating: number | null; review: string | null; customCoverUrl: string | null } }>(
      `/media/${id}/state`
    ),

  // Import to DB
  import: (tmdbId: number, type: "movie" | "series") =>
    fetcher<{
      success: true;
      message: string;
      mediaId: string;
      slug: string;
      data: EnrichedMediaData;
    }>("/media/import", {
      method: "POST",
      body: JSON.stringify({ tmdbId, type }),
    }),

  // Batch Import
  importBatch: (items: { tmdbId: number; type: "movie" | "series" }[]) =>
    fetcher<{
      success: true;
      results: {
        imported: number;
        skipped: number;
        failed: number;
        details: { success: string[]; failed: { tmdbId: number; error: string }[]; skipped: number[] };
      };
    }>("/media/import/batch", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),

  getReviews: (id: string, sort: "popular" | "recent" = "popular", page = 1) =>
    fetcher<PaginatedResponse<Review>>(
      `/media/${id}/reviews?sort=${sort}&page=${page}`
    ),

  getLists: (id: string, page = 1, limit = 6) =>
    fetcher<PaginatedResponse<List>>(
      `/media/${id}/lists?page=${page}&limit=${limit}`
    ),
};

// ==================== REVIEWS ====================

export const reviewsApi = {
  list: (params: { mediaId?: string; userId?: string; page?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.mediaId) searchParams.set("media_id", params.mediaId);
    if (params.userId) searchParams.set("user_id", params.userId);
    if (params.page) searchParams.set("page", String(params.page));
    return fetcher<PaginatedResponse<Review>>(`/reviews?${searchParams}`);
  },

  getById: (id: string) => fetcher<Review>(`/reviews/${id}`),

  create: (data: CreateReviewInput) =>
    fetcher<Review>("/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateReviewInput>) =>
    fetcher<Review>(`/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetcher<{ message: string }>(`/reviews/${id}`, { method: "DELETE" }),

  like: (id: string) =>
    fetcher<{ liked: boolean }>(`/reviews/${id}/like`, {
      method: "POST",
    }),

  unlike: (id: string) =>
    fetcher<{ success: boolean }>(`/reviews/${id}/like`, { method: "DELETE" }),
};

// ==================== COMMENTS ====================

export const commentsApi = {
  list: (targetType: "review" | "list", targetId: string, page = 1) =>
    fetcher<PaginatedResponse<Comment>>(
      `/comments?target_type=${targetType}&target_id=${targetId}&page=${page}`
    ),

  replies: (commentId: string) =>
    fetcher<{ data: Comment[] }>(`/comments/${commentId}/replies`),

  create: (data: {
    target_type: "review" | "list";
    target_id: string;
    content: string;
    parent_id?: string;
  }) =>
    fetcher<{ data: Comment }>("/comments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetcher<{ success: boolean }>(`/comments/${id}`, { method: "DELETE" }),

  like: (id: string) =>
    fetcher<{ success: boolean }>(`/comments/${id}/like`, { method: "POST" }),
};

// ==================== LISTS ====================

export const listsApi = {
  get: (options: { page?: number; limit?: number; user_id?: string; membership_media_id?: string } = {}) => {
    const params = new URLSearchParams();
    if (options.page) params.set("page", String(options.page));
    if (options.limit) params.set("limit", String(options.limit));
    if (options.user_id) params.set("user_id", options.user_id);
    if (options.membership_media_id) params.set("membership_media_id", options.membership_media_id);
    return fetcher<PaginatedResponse<List & { isInList?: boolean }>>(`/lists?${params}`);
  },

  getById: (id: string) => fetcher<{ data: ListDetails }>(`/lists/${id}`),

  getBySlug: (username: string, slug: string) => 
    fetcher<{ data: ListDetails }>(`/lists/by-slug/${username}/${slug}`),

  create: (data: CreateListInput) =>
    fetcher<{ data: List }>("/lists", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        is_public: data.isPublic,
        is_ranked: data.isRanked,
        category: data.category,
        item_ids: data.item_ids,
      }),
    }),

  update: (id: string, data: Partial<CreateListInput>) =>
    fetcher<{ data: List }>(`/lists/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        is_public: data.isPublic,
        is_ranked: data.isRanked,
        category: data.category,
        item_ids: data.item_ids,
      }),
    }),

  delete: (id: string) =>
    fetcher<{ message: string }>(`/lists/${id}`, { method: "DELETE" }),

  addItem: (listId: string, mediaId: string) =>
    fetcher<{ data: { id: string; listId: string; mediaId: string } }>(`/lists/${listId}/items`, {
      method: "POST",
      body: JSON.stringify({ media_id: mediaId }),
    }),

  removeItem: (listId: string, mediaId: string) =>
    fetcher<{ message: string }>(`/lists/${listId}/items/${mediaId}`, {
      method: "DELETE",
    }),
};

// ==================== WATCHLIST ====================

export const watchlistApi = {
  list: () =>
    fetcher<{ items: WatchlistItem[] }>("/watchlist"),

  add: (
    mediaId: string,
    priority: "low" | "medium" | "high" = "medium"
  ) =>
    fetcher<WatchlistItem>("/watchlist", {
      method: "POST",
      body: JSON.stringify({ media_id: mediaId, priority }),
    }),

  remove: (mediaId: string) =>
    fetcher<{ message: string }>(`/watchlist/${mediaId}`, {
      method: "DELETE",
    }),
};

// ==================== DIARY ====================

export const diaryApi = {
  list: (page = 1) =>
    fetcher<PaginatedResponse<DiaryEntry>>(`/diary?page=${page}`),

  add: (
    mediaId: string,
    data: {
      rating?: number;
      notes?: string;
      reviewTitle?: string;
      isRewatch?: boolean;
      watchedAt?: string;
      containsSpoilers?: boolean;
    }
  ) =>
    fetcher<DiaryEntry>("/diary", {
      method: "POST",
      body: JSON.stringify({
        media_id: mediaId,
        rating: data.rating,
        notes: data.notes,
        review_title: data.reviewTitle,
        is_rewatch: data.isRewatch,
        watched_at: data.watchedAt,
        contains_spoilers: data.containsSpoilers,
      }),
    }),
};

// ==================== FEED ====================

export const feedApi = {
  getPersonal: (page = 1) =>
    fetcher<PaginatedResponse<Activity>>(`/feed?page=${page}`),

  getGlobal: (page = 1) =>
    fetcher<PaginatedResponse<Activity>>(`/feed/global?page=${page}`),

  getUser: (userId: string, page = 1) =>
    fetcher<PaginatedResponse<Activity>>(`/feed/user/${userId}?page=${page}`),
};

// ==================== SEARCH ====================

export const searchApi = {
  search: (
    query: string,
    options: { type?: "all" | "movie" | "series" | "users" | "lists"; page?: number; limit?: number } = {}
  ) => {
    const params = new URLSearchParams({ q: query });
    if (options.type  && options.type !== "all") params.set("type", options.type);
    if (options.page  && options.page > 1)        params.set("page",  String(options.page));
    if (options.limit)                             params.set("limit", String(options.limit));
    return fetcher<{
      media:      SearchResult[];
      users:      Pick<User, "id" | "username" | "displayName" | "avatarUrl" | "isVerified">[];
      lists:      Pick<List, "id" | "name" | "description" | "itemsCount" | "userId">[];
      page:       number;
      totalPages: number;
      total:      number;
      hasNext:    boolean;
      hasPrev:    boolean;
    }>(`/search?${params}`);
  },
};

// ==================== NOTIFICATIONS ====================

export const notificationsApi = {
  list: (page = 1) =>
    fetcher<PaginatedResponse<Notification>>(`/notifications?page=${page}`),

  markAsRead: (id: string) =>
    fetcher<Notification>(`/notifications/${id}/read`, {
      method: "POST",
    }),

  markAllAsRead: () =>
    fetcher<{ message: string }>("/notifications/read-all", {
      method: "POST",
    }),
};

// ==================== SERIES ====================

interface SeriesSeason {
  id: string;
  seriesId: string;
  seasonNumber: number;
  name: string;
  overview?: string;
  posterPath?: string;
  episodeCount?: number;
  airDate?: string;
}

interface SeriesEpisode {
  id: string;
  seasonId: string;
  episodeNumber: number;
  name: string;
  overview?: string;
  stillPath?: string;
  airDate?: string;
  runtime?: number;
  watched?: boolean;
  watchedAt?: string;
  rating?: number;
  notes?: string;
}

interface SeasonProgress {
  watched: number;
  total: number;
  percentage: number;
}

interface EpisodeWatchRecord {
  id: string;
  episodeId: string;
  userId: string;
  watchedAt: string;
  rating?: number;
  notes?: string;
}

interface SeasonRating {
  id: string;
  seasonId: string;
  userId: string;
  rating: number;
  notes?: string;
}

export const seriesApi = {
  sync: (id: string) =>
    fetcher<{ success: boolean; message: string }>(`/series/${id}/sync`, {
      method: "POST",
    }),
  getSeasons: (id: string) =>
    fetcher<{ data: SeriesSeason[] }>(`/series/${id}/seasons`),
  getSeasonDetails: (id: string, seasonNumber: number) =>
    fetcher<{ data: { season: SeriesSeason; episodes: SeriesEpisode[]; progress: SeasonProgress } }>(`/series/${id}/seasons/${seasonNumber}`),
  watchEpisode: (id: string, episodeId: string, data?: { rating?: number; notes?: string }) =>
    fetcher<{ data: EpisodeWatchRecord }>(`/series/${id}/episodes/${episodeId}/watch`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),
  unwatchEpisode: (id: string, episodeId: string) =>
    fetcher<{ success: boolean }>(`/series/${id}/episodes/${episodeId}/watch`, {
      method: "DELETE",
    }),
  rateSeason: (id: string, seasonNumber: number, data: { rating: number; notes?: string }) =>
    fetcher<{ data: SeasonRating }>(`/series/${id}/seasons/${seasonNumber}/rate`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteSeasonRating: (id: string, seasonNumber: number) =>
    fetcher<{ success: boolean }>(`/series/${id}/seasons/${seasonNumber}/rate`, {
      method: "DELETE",
    }),
  watchAllSeason: (id: string, seasonNumber: number) =>
    fetcher<{ success: boolean; marked: number }>(`/series/${id}/seasons/${seasonNumber}/watch-all`, {
      method: "POST",
    }),
};

// ==================== LIKES ====================

export const likesApi = {
  like: (targetType: "media" | "review" | "list", targetId: string) =>
    fetcher<{ data: { id: string; targetType: string; targetId: string; userId: string }; isNew: boolean }>("/likes", {
      method: "POST",
      body: JSON.stringify({ targetType, targetId }),
    }),

  unlike: (targetType: "media" | "review" | "list", targetId: string) =>
    fetcher<{ success: boolean; message: string }>(`/likes/${targetType}/${targetId}`, {
      method: "DELETE",
    }),

  listMedia: (userId: string, params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    return fetcher<{ data: Array<{ id: string; createdAt: string; media: { id: string; title: string; slug: string; posterPath: string | null; type: string; releaseDate: string | null } }> }>(
      `/likes/media/user/${userId}?${qs}`
    );
  },
};

// ==================== BOOKMARKS ====================

export const bookmarksApi = {
  bookmark: (targetType: "media" | "review" | "list", targetId: string, note?: string) =>
    fetcher<{ data: { id: string; targetType: string; targetId: string; userId: string; note: string | null; createdAt: string }; isNew: boolean }>("/bookmarks", {
      method: "POST",
      body: JSON.stringify({ targetType, targetId, note }),
    }),

  unbookmark: (targetType: "media" | "review" | "list", targetId: string) =>
    fetcher<{ success: boolean }>(`/bookmarks/${targetType}/${targetId}`, {
      method: "DELETE",
    }),

  check: (targetType: string, targetId: string) =>
    fetcher<{ bookmarked: boolean }>(`/bookmarks/check/${targetType}/${targetId}`),

  list: (params?: { targetType?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.targetType) qs.set("targetType", params.targetType);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return fetcher<{ data: { id: string; targetType: string; targetId: string; note: string | null; createdAt: string }[]; pagination: { page: number; limit: number; hasMore: boolean } }>(`/bookmarks?${qs}`);
  },
};

// ==================== PEOPLE ====================

export const peopleApi = {
  getById: (id: string) =>
    fetcher<{
      person: {
        id: string;
        tmdbId: number;
        name: string;
        profilePath?: string;
        knownFor?: string;
        biography?: string;
        birthDate?: string;
        deathDate?: string;
        birthPlace?: string;
        popularity?: number;
      };
      credits: Record<string, unknown>[];
    }>(`/people/${id}`),
};

// ==================== IDENTITY ====================

export const identityApi = {
  getMe: () =>
    fetcher<{ data: import("@/types").UserIdentity }>("/identity/me"),

  getFrames: () =>
    fetcher<{ data: import("@/types").ProfileFrame[] }>("/identity/frames"),

  getTitles: () =>
    fetcher<{ data: import("@/types").ProfileTitle[] }>("/identity/titles"),

  setFrame: (frameId: string | null) =>
    fetcher<{ data: import("@/types").UserIdentityPerks }>("/identity/frame", {
      method: "PATCH",
      body: JSON.stringify({ frameId }),
    }),

  setTitle: (titleId: string | null) =>
    fetcher<{ data: import("@/types").UserIdentityPerks }>("/identity/title", {
      method: "PATCH",
      body: JSON.stringify({ titleId }),
    }),

  updateAppearance: (data: {
    accentColor?: string | null;
    profileTheme?: string | null;
    showcasedBadges?: string[];
  }) =>
    fetcher<{ data: Record<string, unknown> }>("/identity/appearance", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  unlockTitle: (titleId: string) =>
    fetcher<{ data: { userId: string; titleId: string; unlockedAt: string } }>(
      `/identity/titles/${titleId}/unlock`,
      { method: "POST" }
    ),

  getByUsername: (username: string) =>
    fetcher<{ data: import("@/types").UserIdentity }>(`/identity/${username}`),
};

// ==================== PLANS ====================

export const plansApi = {
  list: () => fetcher<{ plans: Plan[] }>("/plans"),

  getBySlug: (slug: string) => fetcher<Plan>(`/plans/${slug}`),
};

// ==================== STORIES ====================

export interface StoryViewer {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  viewedAt: string;
}

export interface StoryReply {
  id: string;
  reaction: string;
  textReply: string;
  createdAt: string;
  user: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
}

export interface QuestionResponse {
  id: string;
  response: string;
  createdAt: string;
  user: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
}

export interface StoryHighlight {
  id: string;
  userId: string;
  name: string;
  coverImageUrl: string | null;
  position: number;
  createdAt: string;
  previewStories?: Story[];
  storyCount?: number;
}

export interface Story {
  id: string;
  userId: string;
  type: string;
  content: Record<string, unknown>;
  imageUrl: string | null;
  isPinned: boolean;
  isExpired: boolean;
  isArchived?: boolean;
  visibility?: string;
  slides?: Record<string, unknown>[] | null;
  expiresAt: string;
  viewsCount: number;
  reactionsCount: number;
  createdAt: string;
  user?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  hasViewed?: boolean;
}

export const storiesApi = {
  create: (data: {
    type: string;
    content: Record<string, unknown>;
    expires_at?: string;
    visibility?: string;
    slides?: Record<string, unknown>[];
  }) =>
    fetcher<{ data: Story }>("/stories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getFeed: (page = 1, limit = 20) =>
    fetcher<{ data: Story[]; page: number; limit: number; hasNext: boolean; hasPrev: boolean }>(
      `/stories/feed?page=${page}&limit=${limit}`
    ),

  getByUser: (username: string, page = 1) =>
    fetcher<{ data: Story[]; page: number; limit: number; hasNext: boolean; hasPrev: boolean }>(
      `/stories/user/${username}?page=${page}`
    ),

  getById: (id: string) =>
    fetcher<{
      data: Story & {
        reactions: { reaction: string; count: number }[];
        pollResults?: { optionIndex: number; count: number }[];
        userReaction: string | null;
        userPollVote: number | null;
      };
    }>(`/stories/${id}`),

  delete: (id: string) =>
    fetcher<null>(`/stories/${id}`, { method: "DELETE" }),

  view: (id: string) =>
    fetcher<{ success: boolean; already_viewed?: boolean }>(`/stories/${id}/view`, {
      method: "POST",
    }),

  react: (id: string, reaction: string, textReply?: string) =>
    fetcher<{ data: { id: string; reaction: string; textReply?: string } }>(
      `/stories/${id}/react`,
      {
        method: "POST",
        body: JSON.stringify({ reaction, text_reply: textReply }),
      }
    ),

  removeReaction: (id: string) =>
    fetcher<{ success: boolean }>(`/stories/${id}/react`, { method: "DELETE" }),

  pollVote: (id: string, optionIndex: number) =>
    fetcher<{ success: boolean; pollResults: { optionIndex: number; count: number }[] }>(
      `/stories/${id}/poll-vote`,
      {
        method: "POST",
        body: JSON.stringify({ option_index: optionIndex }),
      }
    ),

  pin: (id: string, pinned?: boolean) =>
    fetcher<{ data: Story }>(`/stories/${id}/pin`, {
      method: "PATCH",
      body: JSON.stringify({ pinned }),
    }),

  getViewers: (id: string, page = 1) =>
    fetcher<{ data: StoryViewer[]; total: number; page: number; limit: number; hasNext: boolean; hasPrev: boolean }>(
      `/stories/${id}/viewers?page=${page}`
    ),

  getReplies: (id: string) =>
    fetcher<{ data: StoryReply[] }>(`/stories/${id}/replies`),

  getArchive: (page = 1, limit = 20) =>
    fetcher<{ data: Story[]; page: number; limit: number; hasNext: boolean; hasPrev: boolean }>(
      `/stories/archive?page=${page}&limit=${limit}`
    ),

  archive: (id: string, archived?: boolean) =>
    fetcher<{ data: Story }>(`/stories/${id}/archive`, {
      method: "PATCH",
      body: JSON.stringify({ archived }),
    }),

  quizAnswer: (id: string, answerIndex: number) =>
    fetcher<{ is_correct: boolean; correct_index: number; stats: Record<number, number> }>(
      `/stories/${id}/quiz-answer`,
      { method: "POST", body: JSON.stringify({ answer_index: answerIndex }) }
    ),

  questionResponse: (id: string, response: string) =>
    fetcher<{ success: boolean }>(`/stories/${id}/question-response`, {
      method: "POST",
      body: JSON.stringify({ response }),
    }),

  getQuestionResponses: (id: string) =>
    fetcher<{ data: QuestionResponse[] }>(`/stories/${id}/question-responses`),

  uploadImage: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${API_URL}/stories/${id}/image`, {
      method: "POST",
      body: formData,
      credentials: "include",
      // No Content-Type header — browser sets it with boundary for multipart
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new ApiError(error.error || "Upload failed", res.status);
    }

    return res.json() as Promise<{ data: Story; imageUrl: string }>;
  },
};

// ==================== HIGHLIGHTS ====================

export const highlightsApi = {
  getByUser: (username: string) =>
    fetcher<{ data: StoryHighlight[] }>(`/story-highlights/user/${username}`),

  getById: (id: string) =>
    fetcher<{ data: { highlight: StoryHighlight; stories: Story[] } }>(`/story-highlights/${id}`),

  create: (data: { name: string; cover_image_url?: string; story_ids?: string[] }) =>
    fetcher<{ data: StoryHighlight }>("/story-highlights", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; cover_image_url?: string | null; position?: number }) =>
    fetcher<{ data: StoryHighlight }>(`/story-highlights/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetcher<null>(`/story-highlights/${id}`, { method: "DELETE" }),

  addItems: (id: string, storyIds: string[]) =>
    fetcher<{ success: boolean }>(`/story-highlights/${id}/items`, {
      method: "POST",
      body: JSON.stringify({ story_ids: storyIds }),
    }),

  removeItem: (id: string, storyId: string) =>
    fetcher<{ success: boolean }>(`/story-highlights/${id}/items/${storyId}`, {
      method: "DELETE",
    }),

  uploadCover: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${API_URL}/story-highlights/${id}/cover`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Upload failed");
    }
    return res.json() as Promise<{ data: StoryHighlight; coverImageUrl: string }>;
  },
};

// ==================== CLOSE FRIENDS ====================

export const closeFriendsApi = {
  list: () =>
    fetcher<{ data: (Pick<User, "id" | "username" | "displayName" | "avatarUrl"> & { addedAt: string })[] }>(
      "/close-friends"
    ),

  add: (friendId: string) =>
    fetcher<{ success: boolean }>("/close-friends", {
      method: "POST",
      body: JSON.stringify({ friend_id: friendId }),
    }),

  remove: (friendId: string) =>
    fetcher<{ success: boolean }>(`/close-friends/${friendId}`, { method: "DELETE" }),

  getStatus: (userId: string) =>
    fetcher<{ isCloseFriend: boolean }>(`/close-friends/status/${userId}`),
};

// ==================== GAMIFICATION ====================

export const gamificationApi = {
  getAchievements: () =>
    fetcher<{ data: Achievement[] }>("/gamification/achievements"),

  getXpHistory: (limit = 20) =>
    fetcher<{ data: XpActivity[] }>(`/gamification/xp-history?limit=${limit}`),

  getLeaderboard: (limit = 50) =>
    fetcher<{ data: LeaderboardEntry[] }>(`/gamification/leaderboard?limit=${limit}`),
};

// ==================== ACTIVITY / SCROBBLES ====================

export const activityApi = {
  getScrobbles: (userId: string, page = 1, limit = 20) =>
    fetcher<PaginatedResponse<Scrobble>>(`/activity/scrobbles/${userId}?page=${page}&limit=${limit}`),

  createScrobble: (data: {
    title: string;
    media_type: "movie" | "episode";
    tmdb_id?: number;
    season?: number;
    episode?: number;
    runtime_minutes?: number;
    source?: string;
    watched_at?: string;
  }) =>
    fetcher<{ data: Scrobble }>("/activity/scrobbles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteScrobble: (id: string) =>
    fetcher<{ success: boolean }>(`/activity/scrobbles/${id}`, { method: "DELETE" }),
};

// ==================== CLUBS (INVITES) ====================

export const clubsApi = {
  getInvites: () =>
    fetcher<{ data: ClubInvite[] }>("/clubs/invites"),

  acceptInvite: (inviteId: string) =>
    fetcher<{ success: boolean }>(`/clubs/invites/${inviteId}/accept`, { method: "POST" }),

  declineInvite: (inviteId: string) =>
    fetcher<{ success: boolean }>(`/clubs/invites/${inviteId}/decline`, { method: "POST" }),
};

// ==================== EXPORT ALL ====================

interface DiscoverOptions {
  page?: number;
  type?: string;
  genre?: string;
  year?: number;
  sortBy?: string;
  streaming?: string;
  limit?: number;
  period?: string;
}

export const api = {
  auth: authApi,
  users: usersApi,
  media: mediaApi,
  reviews: reviewsApi,
  lists: listsApi,
  watchlist: watchlistApi,
  diary: diaryApi,
  feed: feedApi,
  search: searchApi,
  notifications: notificationsApi,
  likes: likesApi,
  bookmarks: bookmarksApi,
  comments: commentsApi,
  people: peopleApi,
  plans: plansApi,
  identity: identityApi,
  stories: storiesApi,
  highlights: highlightsApi,
  closeFriends: closeFriendsApi,
  series: seriesApi,
  gamification: gamificationApi,
  activity: activityApi,
  clubs: clubsApi,
  discover: {
    get: (options: DiscoverOptions = {}) => {
      const params = new URLSearchParams();
      if (options.page) params.set("page", String(options.page));
      if (options.type) params.set("type", options.type);
      if (options.genre) params.set("genre", options.genre);
      if (options.year) params.set("year", String(options.year));
      if (options.sortBy) params.set("sortBy", options.sortBy);
      if (options.streaming) params.set("streaming", options.streaming);
      return fetcher<{ data: SearchResult[]; page: number; totalPages: number; total: number }>(`/discover?${params}`);
    },
    genres: () => fetcher<{ data: { id: number; name: string }[] }>("/discover/genres"),
    streaming: () => fetcher<{ data: { id: string; name: string; logoPath?: string }[] }>("/discover/streaming"),
    random: (options: Omit<DiscoverOptions, "page" | "sortBy"> = {}) => {
      const params = new URLSearchParams();
      if (options.limit) params.set("limit", String(options.limit));
      if (options.type) params.set("type", options.type);
      if (options.genre) params.set("genre", options.genre);
      if (options.year) params.set("year", String(options.year));
      if (options.streaming) params.set("streaming", options.streaming);
      return fetcher<{ data: SearchResult[] }>("/discover/random?" + params.toString());
    },
    popular: (options: Pick<DiscoverOptions, "period" | "type"> = {}) => {
      const params = new URLSearchParams();
      if (options.period) params.set("period", options.period);
      if (options.type) params.set("type", options.type);
      return fetcher<{ data: SearchResult[] }>(`/discover/popular?${params}`);
    },
    trending: (options: { type?: "movie" | "series"; limit?: number } = {}) => {
      const params = new URLSearchParams();
      if (options.type) params.set("type", options.type);
      if (options.limit) params.set("limit", String(options.limit));
      return fetcher<{ media: SearchResult[]; reviews: unknown[]; lists: unknown[] }>(`/discover/trending?${params}`);
    },
  },
  reports: {
    create: (data: {
      targetType: string;
      targetId: string;
      reason: string;
      description?: string;
    }) =>
      fetcher<{ data: { id: string } }>("/reports", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  blocks: {
    block: (userId: string) =>
      fetcher<{ success: boolean }>("/blocks", {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),
    unblock: (userId: string) =>
      fetcher<{ success: boolean }>(`/blocks/${userId}`, { method: "DELETE" }),
    check: (userId: string) =>
      fetcher<{ blocked: boolean }>(`/blocks/check/${userId}`),
    list: (page = 1) =>
      fetcher<{ data: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null }[]; total: number }>(`/blocks?page=${page}&limit=20`),
  },
  messages: {
    listConversations: (page = 1, limit = 20) =>
      fetcher<{ data: import("@/types").Conversation[]; total: number; page: number; limit: number; hasNext: boolean; hasPrev: boolean }>(
        `/messages/conversations?page=${page}&limit=${limit}`
      ),
    getConversation: (id: string) =>
      fetcher<import("@/types").Conversation>(`/messages/conversations/${id}`),
    createConversation: (data: { type: "dm" | "group"; participantIds: string[]; name?: string }) =>
      fetcher<import("@/types").Conversation>("/messages/conversations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getMessages: (conversationId: string, params?: { limit?: number; before?: string }) => {
      const qs = new URLSearchParams();
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.before) qs.set("before", params.before);
      return fetcher<{ data: import("@/types").Message[]; hasMore: boolean; nextCursor: string | null }>(
        `/messages/conversations/${conversationId}/messages?${qs}`
      );
    },
    sendMessage: (
      conversationId: string,
      data: { content: string; type?: "text" | "story_reply" | "image"; metadata?: Record<string, unknown>; replyToId?: string }
    ) =>
      fetcher<import("@/types").Message>(`/messages/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    markRead: (conversationId: string) =>
      fetcher<{ success: boolean }>(`/messages/conversations/${conversationId}/read`, { method: "POST" }),
    getUnreadCount: () =>
      fetcher<{ count: number }>("/messages/unread-count"),
    storyReply: (data: { storyId: string; content: string }) =>
      fetcher<{ conversationId: string; message: import("@/types").Message }>("/messages/story-reply", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getSettings: () =>
      fetcher<import("@/types").DmSettings>("/messages/settings"),
    updateSettings: (data: Partial<import("@/types").DmSettings>) =>
      fetcher<import("@/types").DmSettings>("/messages/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};

export { ApiError };
export type { PaginatedResponse };
