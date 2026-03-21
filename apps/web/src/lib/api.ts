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

  // Legacy / Local access
  getById: (id: string) => fetcher<{ data: MediaDetails }>(`/media/${id}`),

  getBySlug: (slug: string) =>
    fetcher<{ data: MediaDetails }>(`/media/slug/${slug}`),

  getState: (id: string) =>
    fetcher<{ data: { liked: boolean; watched: boolean; inWatchlist: boolean; rating: number | null; review: string | null } }>(
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
    fetcher<{ data: any }>(`/lists/${listId}/items`, {
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
    data: { rating?: number; notes?: string; isRewatch?: boolean }
  ) =>
    fetcher<DiaryEntry>("/diary", {
      method: "POST",
      body: JSON.stringify({
        media_id: mediaId,
        rating: data.rating,
        notes: data.notes,
        is_rewatch: data.isRewatch,
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

export const seriesApi = {
  sync: (id: string) =>
    fetcher<{ success: boolean; message: string }>(`/series/${id}/sync`, {
      method: "POST",
    }),
  getSeasons: (id: string) => 
    fetcher<{ data: any[] }>(`/series/${id}/seasons`),
  getSeasonDetails: (id: string, seasonNumber: number) =>
    fetcher<{ data: { season: any; episodes: any[]; progress: any } }>(`/series/${id}/seasons/${seasonNumber}`),
  watchEpisode: (id: string, episodeId: string, data?: { rating?: number; notes?: string }) =>
    fetcher<{ data: any }>(`/series/${id}/episodes/${episodeId}/watch`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),
  unwatchEpisode: (id: string, episodeId: string) =>
    fetcher<{ success: boolean }>(`/series/${id}/episodes/${episodeId}/watch`, {
      method: "DELETE",
    }),
};

// ==================== LIKES ====================

export const likesApi = {
  like: (targetType: "media" | "review" | "list", targetId: string) =>
    fetcher<{ data: any; isNew: boolean }>("/likes", {
      method: "POST",
      body: JSON.stringify({ targetType, targetId }),
    }),

  unlike: (targetType: "media" | "review" | "list", targetId: string) =>
    fetcher<{ success: boolean; message: string }>(`/likes/${targetType}/${targetId}`, {
      method: "DELETE",
    }),
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

// ==================== PLANS ====================

export const plansApi = {
  list: () => fetcher<{ plans: Plan[] }>("/plans"),

  getBySlug: (slug: string) => fetcher<Plan>(`/plans/${slug}`),
};

// ==================== STORIES ====================

export interface Story {
  id: string;
  userId: string;
  type: "watch" | "list" | "rating" | "poll" | "hot_take" | "rewind";
  content: Record<string, unknown>;
  imageUrl: string | null;
  isPinned: boolean;
  isExpired: boolean;
  expiresAt: string;
  viewsCount: number;
  reactionsCount: number;
  createdAt: string;
  user?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  hasViewed?: boolean;
}

export const storiesApi = {
  create: (data: { type: string; content: Record<string, unknown>; expires_at?: string }) =>
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

// ==================== EXPORT ALL ====================

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
  people: peopleApi,
  plans: plansApi,
  stories: storiesApi,
  series: seriesApi,
  discover: {
    get: (options: any = {}) => {
      const params = new URLSearchParams();
      if (options.page) params.set("page", String(options.page));
      if (options.type) params.set("type", options.type);
      if (options.genre) params.set("genre", options.genre);
      if (options.year) params.set("year", String(options.year));
      if (options.sortBy) params.set("sortBy", options.sortBy);
      if (options.streaming) params.set("streaming", options.streaming);
      return fetcher<any>(`/discover?${params}`);
    },
    genres: () => fetcher<{ data: any[] }>("/discover/genres"),
    streaming: () => fetcher<{ data: any[] }>("/discover/streaming"),
    random: (options: any = {}) => {
      const params = new URLSearchParams();
      if (options.limit) params.set("limit", String(options.limit));
      if (options.type) params.set("type", options.type);
      if (options.genre) params.set("genre", options.genre);
      if (options.year) params.set("year", String(options.year));
      if (options.streaming) params.set("streaming", options.streaming);
      return fetcher<{ data: any[] }>("/discover/random?" + params.toString());
    },
    popular: (options: any = {}) => {
      const params = new URLSearchParams();
      if (options.period) params.set("period", options.period);
      if (options.type) params.set("type", options.type);
      return fetcher<{ data: any[] }>(`/discover/popular?${params}`);
    }
  }
};

export { ApiError };
export type { PaginatedResponse };
