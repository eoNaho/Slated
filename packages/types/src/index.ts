// ================================================
// PixelReel - Database Types (auto-generated style)
// ================================================

// ==========================================
// ENUMS
// ==========================================

export type MediaType = "movie" | "series";
export type MediaStatus =
  | "released"
  | "upcoming"
  | "in_production"
  | "canceled";
export type GenderType = "male" | "female" | "non_binary" | "unknown";
export type UserRole = "user" | "moderator" | "admin";
export type UserStatus = "active" | "suspended" | "banned";
export type Priority = "low" | "medium" | "high";
export type ClubEventType = "watch" | "discussion";
export type ActivityType =
  | "watched"
  | "review"
  | "rating"
  | "list"
  | "like"
  | "follow"
  | "achievement";
export type TargetType = "media" | "review" | "list" | "club" | "event";
export type AchievementCategory =
  | "watching"
  | "social"
  | "critic"
  | "explorer"
  | "collector"
  | "special";
export type AchievementType = "milestone" | "streak" | "challenge" | "rare";
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type SubscriptionStatus = "active" | "canceled" | "expired" | "past_due";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type ReportStatus =
  | "pending"
  | "investigating"
  | "resolved"
  | "dismissed";
export type ReportPriority = "low" | "medium" | "high" | "critical";

// ==========================================
// BASE TYPES
// ==========================================

export interface User {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  website: string | null;
  is_verified: boolean;
  is_premium: boolean;
  role: UserRole;
  status: UserStatus;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  theme: string;
  language: string;
  privacy: {
    profile: "public" | "private" | "followers";
    activity: "public" | "private" | "followers";
    watchlist: "public" | "private" | "followers";
  };
  notifications: {
    email: boolean;
    push: boolean;
    followers: boolean;
    comments: boolean;
    likes: boolean;
  };
  updated_at: string;
}

export interface UserSocialLinks {
  user_id: string;
  twitter: string | null;
  instagram: string | null;
  letterboxd: string | null;
  imdb: string | null;
  updated_at: string;
}

export interface Media {
  id: string;
  tmdb_id: number;
  imdb_id: string | null;
  type: MediaType;
  title: string;
  original_title: string | null;
  tagline: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime: number | null;
  budget: number | null;
  revenue: number | null;
  popularity: number;
  vote_average: number;
  vote_count: number;
  status: MediaStatus;
  original_language: string;
  seasons_count: number | null;
  episodes_count: number | null;
  homepage: string | null;
  trailer_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Genre {
  id: string;
  tmdb_id: number | null;
  name: string;
  slug: string;
}

export interface Person {
  id: string;
  tmdb_id: number;
  imdb_id: string | null;
  name: string;
  slug: string;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  birth_place: string | null;
  profile_path: string | null;
  gender: GenderType;
  popularity: number;
  known_for_department: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaCredit {
  id: string;
  media_id: string;
  person_id: string;
  credit_type: "cast" | "crew";
  character: string | null;
  cast_order: number | null;
  department: string | null;
  job: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  media_id: string;
  title: string | null;
  content: string;
  rating: number | null;
  contains_spoilers: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  is_ranked: boolean;
  is_thematic: boolean;
  category: string | null;
  likes_count: number;
  items_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  media_id: string;
  position: number;
  note: string | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  media_id: string;
  priority: Priority;
  created_at: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  media_id: string;
  review_id: string | null;
  watched_at: string;
  rating: number | null;
  is_rewatch: boolean;
  notes: string | null;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  target_type: TargetType;
  target_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  target_type: "review" | "list";
  target_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  type: ActivityType;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  category: AchievementCategory | null;
  type: AchievementType | null;
  rarity: Rarity | null;
  xp_reward: number;
  requirements: Record<string, unknown> | null;
  is_secret: boolean;
  created_at: string;
}

export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  progress: number;
  unlocked_at: string | null;
}

export interface UserStats {
  user_id: string;
  xp: number;
  level: number;
  movies_watched: number;
  series_watched: number;
  episodes_watched: number;
  watch_time_mins: number;
  reviews_count: number;
  lists_count: number;
  likes_received: number;
  followers_count: number;
  following_count: number;
  current_streak: number;
  longest_streak: number;
  average_rating: number | null;
  updated_at: string;
}

export interface XPActivity {
  id: string;
  user_id: string;
  type: string;
  xp_gained: number;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  features: string[] | null;
  limits: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string | null;
  target_type: "user" | "review" | "comment" | "list";
  target_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  assigned_to: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
}

export interface StreamingService {
  id: string;
  tmdb_id: number | null;
  name: string;
  slug: string | null;
  logo_path: string | null;
}

export interface MediaStreaming {
  media_id: string;
  service_id: string;
  country: string;
  url: string | null;
}

// ==========================================
// EXTENDED TYPES (with relations)
// ==========================================

export interface UserProfile extends User {
  settings?: UserSettings;
  social_links?: UserSocialLinks;
  stats?: UserStats;
}

export interface MediaWithDetails extends Media {
  genres?: Genre[];
  credits?: (MediaCredit & { person?: Person })[];
  streaming?: (MediaStreaming & { service?: StreamingService })[];
}

export interface ReviewWithAuthor extends Review {
  user?: Pick<User, "id" | "username" | "display_name" | "avatar_url">;
  media?: Pick<Media, "id" | "title" | "poster_path" | "type">;
}

export interface ListWithItems extends List {
  user?: Pick<User, "id" | "username" | "display_name" | "avatar_url">;
  items?: (ListItem & { media?: Media })[];
}

export interface ActivityWithDetails extends Activity {
  user?: Pick<User, "id" | "username" | "display_name" | "avatar_url">;
  media?: Pick<Media, "id" | "title" | "poster_path" | "type">;
  review?: Pick<Review, "id" | "rating" | "content">;
  list?: Pick<List, "id" | "name">;
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}
