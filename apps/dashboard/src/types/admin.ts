/**
 * Dashboard-specific types that extend or complement the shared @pixelreel/types.
 * These represent API response shapes specific to admin endpoints.
 */

export type { UserRole, UserStatus, ReportStatus, ReportPriority, MediaType } from "@pixelreel/types";

// ==========================================
// ADMIN STATS
// ==========================================

export interface AdminStats {
  user: number;
  media: number;
  reviews: number;
  lists: number;
  reports: number;
  clubs?: number;
  premiumUsers?: number;
  activeUsersLast24h?: number;
  reportsByStatus: {
    pending: number;
    investigating: number;
    resolved: number;
    dismissed: number;
  };
  newUsers: {
    today: number;
    week: number;
    month: number;
  };
  activeUsers: {
    last24h: number;
    last7d: number;
  };
}

// ==========================================
// TIME SERIES / ANALYTICS
// ==========================================

export interface UserGrowthDataPoint {
  date: string;
  count: number;
}

export interface ContentActivityDataPoint {
  date: string;
  reviews: number;
  comments: number;
  lists: number;
}

export interface ReportsAnalytics {
  byReason: Array<{ reason: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  avgResolutionHours: number;
}

// ==========================================
// AUDIT LOGS
// ==========================================

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: string | null;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

// ==========================================
// USERS (admin view)
// ==========================================

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username?: string;
  role: string;
  status: string;
  createdAt: string;
  isPremium?: boolean;
  emailVerified?: boolean;
}

export interface AdminUserDetail extends AdminUser {
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  reviewCount?: number;
  listCount?: number;
  reportsCount?: number;
  lastActiveAt?: string | null;
  extendedBio?: string | null;
}

export interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface LoginHistoryEntry {
  id: string;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  location: string | null;
  success: boolean;
  createdAt: string;
}

// ==========================================
// REPORTS
// ==========================================

export interface AdminReport {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface ReportsResponse {
  reports: AdminReport[];
  total: number;
  page: number;
  limit: number;
}

// ==========================================
// CONTENT FLAGS
// ==========================================

export interface ContentFlag {
  id: string;
  targetType: string;
  targetId: string;
  flagType: string;
  severity: string;
  details: string | null;
  autoActioned: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  status: string;
  createdAt: string;
}

export interface ContentFlagsResponse {
  flags: ContentFlag[];
  total: number;
  page: number;
  limit: number;
}

// ==========================================
// MEDIA
// ==========================================

export interface AdminMedia {
  id: string;
  tmdbId: number;
  type: string;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  rating: number | null;
  voteCount: number | null;
  createdAt: string;
}

export interface MediaResponse {
  media: AdminMedia[];
  total: number;
  page: number;
  limit: number;
}

// ==========================================
// CLUBS
// ==========================================

export interface AdminClub {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  memberCount: number;
  ownerId: string;
  createdAt: string;
}

export interface ClubsResponse {
  clubs: AdminClub[];
  total: number;
}

// ==========================================
// FEATURE FLAGS
// ==========================================

export interface FeatureFlag {
  id: string;
  featureKey: string;
  plan: "free" | "pro" | "ultra";
  enabled: boolean;
  updatedAt: string;
}

// ==========================================
// BLOCKLIST
// ==========================================

export interface BlocklistEntry {
  id: string;
  word: string;
  matchType: "exact" | "contains" | "regex";
  severity: "low" | "medium" | "high";
  category: "profanity" | "slur" | "spam" | "custom";
  isActive: boolean;
  addedBy: string | null;
  createdAt: string;
}

export interface BlocklistResponse {
  entries: BlocklistEntry[];
  total: number;
  page: number;
  limit: number;
}

// ==========================================
// SYSTEM HEALTH
// ==========================================

export interface SystemHealth {
  api: "ok" | "error";
  db: "ok" | "error";
  redis: "ok" | "error";
  storage: {
    used: number;
    total: number;
    unit: string;
  };
}

// ==========================================
// MODERATION HISTORY
// ==========================================

export interface ModerationAction {
  id: string;
  moderatorId: string;
  targetUserId: string;
  targetType: string;
  targetId: string;
  action: string;
  reason: string;
  automated: boolean;
  createdAt: string;
  moderator?: {
    id: string;
    name: string;
    image: string | null;
  };
}

// ==========================================
// PAGINATION
// ==========================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
