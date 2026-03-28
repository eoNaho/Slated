import { Type as t } from "@sinclair/typebox";

// ── Admin query schemas ───────────────────────────────────────────────────────

export const AdminPeriodQuery = t.Object({
  period: t.Optional(t.String()),
});

export const AdminDaysQuery = t.Object({
  days: t.Optional(t.String()),
});

export const AdminSearchQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  q: t.Optional(t.String()),
});

export const AdminReportsQuery = t.Object({
  status: t.Optional(t.String()),
  targetType: t.Optional(t.String()),
  priority: t.Optional(t.String()),
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

export const AdminContentQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  userId: t.Optional(t.String()),
});

export const AdminClubsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  search: t.Optional(t.String()),
});

export const AdminMediaQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  q: t.Optional(t.String()),
  type: t.Optional(t.String()),
});

export const AdminSubscriptionsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  status: t.Optional(t.String()),
});

export const AdminBlocklistQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  q: t.Optional(t.String()),
});

export const AdminAuditLogsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  action: t.Optional(t.String()),
  userId: t.Optional(t.String()),
  from: t.Optional(t.String()),
});

export const AdminDiscussionsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  q: t.Optional(t.String()),
});

// ── Admin body schemas ────────────────────────────────────────────────────────

export const AdminUpdateReportBody = t.Object({
  status: t.Optional(
    t.Union([
      t.Literal("pending"),
      t.Literal("investigating"),
      t.Literal("resolved"),
      t.Literal("dismissed"),
    ])
  ),
  priority: t.Optional(
    t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high"), t.Literal("critical")])
  ),
  assignedTo: t.Optional(t.Union([t.String(), t.Null()])),
});

export const AdminResolveReportBody = t.Object({
  status: t.Union([t.Literal("resolved"), t.Literal("dismissed")]),
});

export const AdminReportActionBody = t.Object({
  action: t.Union([
    t.Literal("ban_user"),
    t.Literal("delete_content"),
    t.Literal("warn_user"),
  ]),
});

export const AdminUserStatusBody = t.Object({
  status: t.Union([t.Literal("active"), t.Literal("suspended"), t.Literal("banned")]),
});

export const AdminUserRoleBody = t.Object({
  role: t.Union([t.Literal("user"), t.Literal("moderator"), t.Literal("admin")]),
});

export const AdminUpdateReviewBody = t.Object({
  content: t.Optional(t.String({ minLength: 1 })),
  containsSpoilers: t.Optional(t.Boolean()),
  isHidden: t.Optional(t.Boolean()),
  hiddenReason: t.Optional(t.Union([t.String(), t.Null()])),
});

export const AdminUpdateCommentBody = t.Object({
  content: t.Optional(t.String({ minLength: 1 })),
  isHidden: t.Optional(t.Boolean()),
  hiddenReason: t.Optional(t.Union([t.String(), t.Null()])),
});

export const AdminUpdateUserBody = t.Object({
  displayName: t.Optional(t.Union([t.String(), t.Null()])),
  username: t.Optional(t.String({ minLength: 2, maxLength: 30 })),
  email: t.Optional(t.String({ format: "email" })),
  bio: t.Optional(t.Union([t.String(), t.Null()])),
  avatarUrl: t.Optional(t.Union([t.String(), t.Null()])),
});

export const AdminCreateMediaBody = t.Object({
  title: t.String({ minLength: 1 }),
  type: t.Union([t.Literal("movie"), t.Literal("tv")]),
  tmdbId: t.Optional(t.Integer()),
  originalTitle: t.Optional(t.Union([t.String(), t.Null()])),
  tagline: t.Optional(t.Union([t.String(), t.Null()])),
  overview: t.Optional(t.Union([t.String(), t.Null()])),
  posterPath: t.Optional(t.Union([t.String(), t.Null()])),
  backdropPath: t.Optional(t.Union([t.String(), t.Null()])),
  releaseDate: t.Optional(t.Union([t.String(), t.Null()])),
  runtime: t.Optional(t.Union([t.Integer(), t.Null()])),
  status: t.Optional(t.String()),
});

export const AdminUpdateMediaBody = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  originalTitle: t.Optional(t.Union([t.String(), t.Null()])),
  tagline: t.Optional(t.Union([t.String(), t.Null()])),
  overview: t.Optional(t.Union([t.String(), t.Null()])),
  posterPath: t.Optional(t.Union([t.String(), t.Null()])),
  backdropPath: t.Optional(t.Union([t.String(), t.Null()])),
  releaseDate: t.Optional(t.Union([t.String(), t.Null()])),
  runtime: t.Optional(t.Union([t.Integer(), t.Null()])),
  status: t.Optional(t.String()),
  homepage: t.Optional(t.Union([t.String(), t.Null()])),
  trailerUrl: t.Optional(t.Union([t.String(), t.Null()])),
  imdbId: t.Optional(t.Union([t.String(), t.Null()])),
  imdbRating: t.Optional(t.Union([t.Number(), t.Null()])),
  imdbVotes: t.Optional(t.Union([t.Integer(), t.Null()])),
  metacriticScore: t.Optional(t.Union([t.Integer(), t.Null()])),
  rottenTomatoesScore: t.Optional(t.Union([t.Integer(), t.Null()])),
});

export const AdminUpdateClubBody = t.Object({
  name: t.Optional(t.String({ minLength: 2 })),
  description: t.Optional(t.Union([t.String(), t.Null()])),
  isPrivate: t.Optional(t.Boolean()),
  isArchived: t.Optional(t.Boolean()),
});

export const AdminClubOwnerBody = t.Object({ newOwnerId: t.String() });

export const AdminGrantSubscriptionBody = t.Object({
  userId: t.String(),
  expiresAt: t.Optional(t.Union([t.String(), t.Null()])),
});

export const AdminFeatureFlagBody = t.Object({
  featureKey: t.String(),
  plan: t.Union([t.Literal("free"), t.Literal("pro"), t.Literal("ultra")]),
  enabled: t.Boolean(),
});

export const AdminAddBlocklistBody = t.Object({
  word: t.String({ minLength: 1 }),
  matchType: t.Optional(
    t.Union([t.Literal("exact"), t.Literal("contains"), t.Literal("regex")])
  ),
  severity: t.Optional(
    t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")])
  ),
  category: t.Optional(
    t.Union([t.Literal("profanity"), t.Literal("slur"), t.Literal("spam"), t.Literal("custom")])
  ),
});

export const AdminUpdateBlocklistBody = t.Object({
  word: t.Optional(t.String({ minLength: 1 })),
  matchType: t.Optional(
    t.Union([t.Literal("exact"), t.Literal("contains"), t.Literal("regex")])
  ),
  severity: t.Optional(
    t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")])
  ),
  category: t.Optional(
    t.Union([t.Literal("profanity"), t.Literal("slur"), t.Literal("spam"), t.Literal("custom")])
  ),
  isActive: t.Optional(t.Boolean()),
});

export const AdminImportBlocklistBody = t.Object({
  words: t.Array(
    t.Object({
      word: t.String(),
      matchType: t.Optional(t.String()),
      severity: t.Optional(t.String()),
      category: t.Optional(t.String()),
    }),
    { minItems: 1 }
  ),
});

export const AdminCreateAnnouncementBody = t.Object({
  title: t.String({ minLength: 1 }),
  message: t.String({ minLength: 1 }),
  type: t.Optional(t.String()),
  imageUrl: t.Optional(t.Union([t.String(), t.Null()])),
  actionLabel: t.Optional(t.Union([t.String(), t.Null()])),
  actionUrl: t.Optional(t.Union([t.String(), t.Null()])),
  isActive: t.Optional(t.Boolean()),
  dismissible: t.Optional(t.Boolean()),
  targetAudience: t.Optional(t.String()),
  startAt: t.Optional(t.Union([t.String(), t.Null()])),
  endAt: t.Optional(t.Union([t.String(), t.Null()])),
});

export const AdminUpdateAnnouncementBody = t.Object({
  title: t.Optional(t.String()),
  message: t.Optional(t.String()),
  type: t.Optional(t.String()),
  imageUrl: t.Optional(t.Union([t.String(), t.Null()])),
  actionLabel: t.Optional(t.Union([t.String(), t.Null()])),
  actionUrl: t.Optional(t.Union([t.String(), t.Null()])),
  isActive: t.Optional(t.Boolean()),
  dismissible: t.Optional(t.Boolean()),
  targetAudience: t.Optional(t.String()),
  startAt: t.Optional(t.Union([t.String(), t.Null()])),
  endAt: t.Optional(t.Union([t.String(), t.Null()])),
});

// ── Moderation schemas ────────────────────────────────────────────────────────

export const ModerationQueueQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  status: t.Optional(t.String()),
  targetType: t.Optional(t.String()),
  priority: t.Optional(t.String()),
  assignedTo: t.Optional(t.String()),
});

export const AssignReportBody = t.Object({
  moderatorId: t.Optional(t.String()),
});

export const ResolveReportBody = t.Object({
  action: t.Union([
    t.Literal("warn"),
    t.Literal("hide_content"),
    t.Literal("delete_content"),
    t.Literal("suspend_user"),
    t.Literal("ban_user"),
    t.Literal("dismiss"),
  ]),
  reason: t.Optional(t.String()),
  resolutionNote: t.Optional(t.String()),
});

export const ContentActionParams = t.Object({
  type: t.String(),
  id: t.String(),
});

export const ContentHideBody = t.Object({
  reason: t.Optional(t.String()),
});

export const WarnUserBody = t.Object({ reason: t.String() });

export const ModerationFlagsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  status: t.Optional(t.String()),
  flagType: t.Optional(t.String()),
  severity: t.Optional(t.String()),
});

export const UpdateModerationFlagBody = t.Object({
  status: t.Union([t.Literal("confirmed"), t.Literal("dismissed")]),
});

// ── Reports schemas ───────────────────────────────────────────────────────────

export const CreateReportBody = t.Object({
  targetType: t.Union([
    t.Literal("user"),
    t.Literal("review"),
    t.Literal("comment"),
    t.Literal("list"),
    t.Literal("story"),
  ]),
  targetId: t.String(),
  reason: t.Union([
    t.Literal("spam"),
    t.Literal("harassment"),
    t.Literal("inappropriate"),
    t.Literal("copyright"),
    t.Literal("hate_speech"),
    t.Literal("misinformation"),
    t.Literal("impersonation"),
    t.Literal("self_harm"),
    t.Literal("other"),
  ]),
  description: t.Optional(t.String({ maxLength: 2000 })),
});
