// ================================================
// PixelReel - Shared Types
// ================================================

// ==========================================
// ENUMS
// ==========================================

export type MediaType = "movie" | "series";
export type MediaStatus = "released" | "upcoming" | "in_production" | "canceled";
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
  | "achievement"
  | "club";
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
export type ReportStatus = "pending" | "investigating" | "resolved" | "dismissed";
export type ReportPriority = "low" | "medium" | "high" | "critical";
export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "achievement"
  | "story_reaction"
  | "story_reply"
  | "story_mention"
  | "club_invite"
  | "dm"
  | "system"
  | "moderation_warning"
  | "content_hidden"
  | "content_restored"
  | "account_suspended";
export type StoryType =
  | "watch"
  | "list"
  | "rating"
  | "poll"
  | "hot_take"
  | "rewind"
  | "countdown"
  | "quiz"
  | "question_box";
export type StoryVisibility = "public" | "followers" | "close_friends";
export type ConversationType = "dm" | "group";
export type MessageType = "text" | "story_reply" | "image" | "system";

// ==========================================
// USERS
// ==========================================

export interface User {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  website: string | null;
  isVerified: boolean;
  isPremium: boolean;
  role: UserRole;
  status: UserStatus;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userId: string;
  theme: string;
  language: string;
  isPrivate: boolean;
  visibilityDiary: "public" | "followers" | "private";
  visibilityWatchlist: "public" | "followers" | "private";
  visibilityActivity: "public" | "followers" | "private";
  visibilityReviews: "public" | "followers" | "private";
  visibilityLists: "public" | "followers" | "private";
  visibilityLikes: "public" | "followers" | "private";
  notifications: {
    email: boolean;
    push: boolean;
    followers: boolean;
    comments: boolean;
    likes: boolean;
  };
  updatedAt: string;
}

export interface UserSocialLinks {
  userId: string;
  twitter: string | null;
  instagram: string | null;
  letterboxd: string | null;
  imdb: string | null;
  updatedAt: string;
}

export interface UserStats {
  userId: string;
  xp: number;
  level: number;
  moviesWatched: number;
  seriesWatched: number;
  episodesWatched: number;
  watchTimeMins: number;
  reviewsCount: number;
  listsCount: number;
  likesReceived: number;
  followersCount: number;
  followingCount: number;
  currentStreak: number;
  longestStreak: number;
  averageRating: number | null;
  updatedAt: string;
}

export interface BioLink {
  label: string;
  url: string;
  icon?: string;
}

export interface BioExtended {
  headline?: string | null;
  location?: string;
  website?: string;
  links?: BioLink[];
  quote?: { text: string; author?: string; source?: string } | null;
  moods?: string[];
  currentlyWatching?: {
    mediaId: string;
    note?: string;
    startedAt?: string;
    progress?: number;
  } | null;
  sections?: { title: string; content: string }[];
}

export interface FavoriteFilm {
  mediaId: string;
  position: number;
  title?: string;
  posterPath?: string | null;
}

// ==========================================
// MEDIA
// ==========================================

export interface Media {
  id: string;
  tmdbId: number;
  imdbId: string | null;
  type: MediaType;
  title: string;
  originalTitle: string | null;
  tagline: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  budget: number | null;
  revenue: number | null;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  status: MediaStatus;
  originalLanguage: string;
  seasonsCount: number | null;
  episodesCount: number | null;
  homepage: string | null;
  trailerUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Genre {
  id: string;
  tmdbId: number | null;
  name: string;
  slug: string;
}

export interface Person {
  id: string;
  tmdbId: number;
  imdbId: string | null;
  name: string;
  slug: string;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  birthPlace: string | null;
  profilePath: string | null;
  gender: GenderType;
  popularity: number;
  knownForDepartment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaCredit {
  id: string;
  mediaId: string;
  personId: string;
  creditType: "cast" | "crew";
  character: string | null;
  castOrder: number | null;
  department: string | null;
  job: string | null;
  createdAt: string;
}

export interface StreamingService {
  id: string;
  tmdbId: number | null;
  name: string;
  slug: string | null;
  logoPath: string | null;
}

export interface MediaStreaming {
  mediaId: string;
  serviceId: string;
  country: string;
  url: string | null;
}

export interface MediaVideo {
  key: string;
  name: string;
  type: string;
  site: string;
  official: boolean | null;
  publishedAt: string | null;
}

export interface MediaImage {
  filePath: string;
  width: number | null;
  height: number | null;
  voteAverage: number | null;
}

export interface MediaGalleryData {
  videos: MediaVideo[];
  backdrops: MediaImage[];
  posters: MediaImage[];
}

export interface ExternalRating {
  source: string;
  value: string;
  url?: string;
}

// ==========================================
// SOCIAL
// ==========================================

export interface Review {
  id: string;
  userId: string;
  mediaId: string;
  title: string | null;
  content: string;
  rating: number | null;
  containsSpoilers: boolean;
  likesCount: number;
  commentsCount: number;
  isHidden: boolean;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  isRanked: boolean;
  likesCount: number;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListItem {
  id: string;
  listId: string;
  mediaId: string;
  position: number;
  note: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  targetType: "review" | "list";
  targetId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Follow {
  followerId: string;
  followingId: string;
  status: "accepted" | "pending";
  createdAt: string;
}

export interface Like {
  id: string;
  userId: string;
  targetType: TargetType;
  targetId: string;
  createdAt: string;
}

// ==========================================
// WATCHLIST & DIARY
// ==========================================

export interface WatchlistItem {
  id: string;
  userId: string;
  mediaId: string;
  priority: Priority;
  createdAt: string;
}

export interface DiaryEntry {
  id: string;
  userId: string;
  mediaId: string;
  reviewId: string | null;
  watchedAt: string;
  rating: number | null;
  isRewatch: boolean;
  notes: string | null;
  createdAt: string;
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export interface Notification {
  id: string;
  userId: string;
  fromUserId: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ==========================================
// STORIES
// ==========================================

export interface Story {
  id: string;
  userId: string;
  type: StoryType;
  content: unknown;
  visibility: StoryVisibility;
  expiresAt: string | null;
  slides: unknown[] | null;
  viewsCount: number;
  reactionsCount: number;
  createdAt: string;
}

export interface StorySlide {
  type: StoryType;
  content: unknown;
  imageUrl?: string | null;
  duration?: number;
}

export interface StoryHighlight {
  id: string;
  userId: string;
  name: string;
  coverImageUrl: string | null;
  position: number;
  createdAt: string;
  storyCount?: number;
}

export interface StoryViewer {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  viewedAt: string;
}

export interface StoryReply {
  id: string;
  storyId: string;
  userId: string;
  content: string;
  createdAt: string;
}

// ==========================================
// MESSAGING
// ==========================================

export interface ConversationParticipant {
  userId: string;
  role: "admin" | "member";
  nickname: string | null;
  isMuted: boolean;
  lastReadAt: string | null;
  joinedAt: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  avatarUrl: string | null;
  createdBy: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  messageCount: number;
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  participants?: ConversationParticipant[];
}

export interface MessageMetadata {
  storyId?: string;
  storyType?: string;
  storyContent?: Record<string, unknown>;
  storyImageUrl?: string | null;
  storyIsExpired?: boolean;
  mediaUrl?: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  metadata: MessageMetadata | null;
  replyToId: string | null;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  createdAt: string;
  senderUsername?: string | null;
  senderDisplayName?: string | null;
  senderAvatarUrl?: string | null;
}

export interface DmSettings {
  userId: string;
  allowDmsFrom: "everyone" | "followers" | "following" | "mutual" | "nobody";
  showReadReceipts: boolean;
  showTypingIndicator: boolean;
}

// ==========================================
// GAMIFICATION
// ==========================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  category: AchievementCategory | null;
  type: AchievementType | null;
  rarity: Rarity | null;
  xpReward: number;
  requirements: Record<string, unknown> | null;
  isSecret: boolean;
  createdAt: string;
  isUnlocked?: boolean;
  unlockedAt?: string | null;
  progress?: number;
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  progress: number;
  unlockedAt: string | null;
}

export interface XPActivity {
  id: string;
  userId: string;
  type: string;
  xpGained: number;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  xp: number;
  level: number;
  moviesWatched: number;
  reviewsCount: number;
}

// ==========================================
// ACTIVITY / SCROBBLES
// ==========================================

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Scrobble {
  id: string;
  userId: string;
  tmdbId: number | null;
  mediaType: "movie" | "episode";
  title: string;
  season: number | null;
  episode: number | null;
  runtimeMinutes: number | null;
  source: string;
  progress: number | null;
  isManual: boolean;
  watchedAt: string;
  createdAt: string;
}

export interface CurrentActivity {
  userId: string;
  tmdbId: number | null;
  mediaType: "movie" | "episode" | null;
  title: string;
  season: number | null;
  episode: number | null;
  progress: number | null;
  source: string | null;
  status: "watching" | "paused" | "finished";
  updatedAt: string;
}

export interface ActivityToken {
  id: string;
  userId: string;
  name: string;
  tokenHash: string;
  lastUsedAt: string | null;
  createdAt: string;
  token?: string;
}

export interface ActivityStats {
  totalScrobbles: number;
  totalMovies: number;
  totalEpisodes: number;
  totalHours: number | null;
  sourceBreakdown: { source: string; count: number }[];
  monthly: { year: number; month: number; count: number; minutes: number | null }[];
}

// ==========================================
// IDENTITY & CUSTOMIZATION
// ==========================================

export interface ProfileFrame {
  id: string;
  name: string;
  slug: string;
  color: string;
  isAnimated: boolean;
  minPlan: string;
  previewUrl: string | null;
  isUnlocked?: boolean;
}

export interface ProfileTitle {
  id: string;
  name: string;
  slug: string;
  bgColor: string;
  textColor: string;
  source: "plan" | "xp" | "achievement";
  minPlan: string | null;
  xpRequired: number | null;
  achievementId: string | null;
  isUnlocked?: boolean;
}

export interface UserIdentityPerks {
  userId: string;
  frameId: string | null;
  activeTitleId: string | null;
  badgeEnabled: boolean;
  verified: boolean;
  frame?: Pick<ProfileFrame, "id" | "name" | "slug" | "color" | "isAnimated"> | null;
  title?: Pick<ProfileTitle, "id" | "name" | "slug" | "bgColor" | "textColor"> | null;
}

export interface UserIdentity {
  perks: UserIdentityPerks | null;
  accentColor: string | null;
  profileTheme: string | null;
  showcasedBadges: string[];
}

// ==========================================
// CLUBS
// ==========================================

export interface ClubInvite {
  id: string;
  clubId: string;
  invitedUserId: string;
  invitedById: string;
  expiresAt: string;
  createdAt: string;
  club: {
    id: string;
    name: string;
    slug: string;
    coverUrl: string | null;
    memberCount?: number;
  };
  invitedBy: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

// ==========================================
// REPORTS & MODERATION
// ==========================================

export interface Report {
  id: string;
  reporterId: string | null;
  targetType: "user" | "review" | "comment" | "list";
  targetId: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  assignedTo: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// PLANS & SUBSCRIPTIONS
// ==========================================

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number | null;
  priceYearly: number | null;
  features: string[] | null;
  limits: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
}

// ==========================================
// MISC
// ==========================================

export interface Tag {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
}

export interface SearchResults {
  media: Media[];
  users: User[];
  lists: List[];
}

// ==========================================
// EXTENDED TYPES (with relations)
// ==========================================

export interface UserProfile extends User {
  settings?: UserSettings;
  socialLinks?: UserSocialLinks;
  stats?: UserStats;
  bioExtended?: BioExtended | null;
  isFollowing?: boolean;
  followStatus?: "accepted" | "pending" | "none";
  isOwnProfile?: boolean;
}

export interface MediaWithDetails extends Media {
  genres?: Genre[];
  credits?: (MediaCredit & { person?: Person })[];
  streaming?: (MediaStreaming & { service?: StreamingService })[];
  externalRatings?: ExternalRating[];
}

export interface ReviewWithAuthor extends Review {
  user?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  media?: Pick<Media, "id" | "title" | "posterPath" | "type">;
}

export interface ListWithItems extends List {
  user?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  items?: (ListItem & { media?: Media })[];
  coverImages?: string[];
}

export interface ActivityWithDetails extends Activity {
  user?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  media?: Pick<Media, "id" | "title" | "posterPath" | "type">;
  review?: Pick<Review, "id" | "rating" | "content">;
  list?: Pick<List, "id" | "name">;
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  detail?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
