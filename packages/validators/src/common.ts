import { Type as t } from "@sinclair/typebox";

// ─── Paginação ────────────────────────────────────────────────────────────────
// Duplicado em 30+ arquivos de rota

export const PaginationQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

export const OffsetQuery = t.Object({
  limit: t.Optional(t.String()),
  offset: t.Optional(t.String()),
});

// ─── Params de rota comuns ────────────────────────────────────────────────────

export const IdParam = t.Object({ id: t.String() });

export const UsernameParam = t.Object({ username: t.String() });

export const UserIdParam = t.Object({ userId: t.String() });

export const ClubIdParam = t.Object({ clubId: t.String() });

export const MediaIdParam = t.Object({ mediaId: t.String() });

export const SlugParam = t.Object({ slug: t.String() });

export const UsernameAndSlugParam = t.Object({
  username: t.String(),
  slug: t.String(),
});

// ─── Polimorfismo de alvo (likes, bookmarks, comentários, reports) ─────────────

export const ContentTargetType = t.Union([
  t.Literal("media"),
  t.Literal("review"),
  t.Literal("list"),
]);

export const CommentTargetType = t.Union([
  t.Literal("review"),
  t.Literal("list"),
]);

export const TargetBody = t.Object({
  targetType: ContentTargetType,
  targetId: t.String(),
});

export const TargetParams = t.Object({
  targetType: ContentTargetType,
  targetId: t.String(),
});

export const CommentTargetQuery = t.Object({
  target_type: CommentTargetType,
  target_id: t.String(),
});

// ─── Ordenação ─────────────────────────────────────────────────────────────────

export const SortQuery = t.Object({
  sortBy: t.Optional(t.String()),
  sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
});

// ─── Tipos de mídia ────────────────────────────────────────────────────────────

export const MediaTypeUnion = t.Union([
  t.Literal("movie"),
  t.Literal("series"),
]);

export const MediaTypeWithEpisode = t.Union([
  t.Literal("movie"),
  t.Literal("episode"),
]);

// ─── Motivo de report ──────────────────────────────────────────────────────────

export const ReportReason = t.Union([
  t.Literal("spam"),
  t.Literal("harassment"),
  t.Literal("inappropriate"),
  t.Literal("copyright"),
  t.Literal("hate_speech"),
  t.Literal("misinformation"),
  t.Literal("impersonation"),
  t.Literal("self_harm"),
  t.Literal("other"),
]);
