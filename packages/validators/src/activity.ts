import { Type as t } from "@sinclair/typebox";

export const ListActivityQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  type: t.Optional(t.String()),
  media_type: t.Optional(
    t.Union([t.Literal("movie"), t.Literal("episode"), t.Null()])
  ),
});

export const CreateScrobbleBody = t.Object({
  media_id: t.String(),
  media_type: t.Union([t.Literal("movie"), t.Literal("episode")]),
  progress: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
  season_id: t.Optional(t.String()),
  episode_id: t.Optional(t.String()),
});

// ─── Token Management ─────────────────────────────────────────────────────────

export const CreateTokenBody = t.Object({
  name: t.Optional(t.String({ maxLength: 60 })),
});

// ─── Heartbeat (extension) ────────────────────────────────────────────────────

export const HeartbeatBody = t.Object({
  title: t.String(),
  season: t.Optional(t.Union([t.Integer(), t.Null()])),
  episode: t.Optional(t.Union([t.Integer(), t.Null()])),
  progress: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 100 }), t.Null()])),
  source: t.String(),
  status: t.Union([t.Literal("watching"), t.Literal("paused"), t.Literal("finished")]),
  tmdb_id: t.Optional(t.Union([t.Integer(), t.Null()])),
  media_type: t.Optional(t.Union([t.Literal("movie"), t.Literal("episode"), t.Null()])),
  runtime_minutes: t.Optional(t.Union([t.Integer(), t.Null()])),
});

// ─── Manual scrobble ──────────────────────────────────────────────────────────

export const ManualScrobbleBody = t.Object({
  title: t.String(),
  media_type: t.Union([t.Literal("movie"), t.Literal("episode")]),
  tmdb_id: t.Optional(t.Union([t.Integer(), t.Null()])),
  season: t.Optional(t.Union([t.Integer(), t.Null()])),
  episode: t.Optional(t.Union([t.Integer(), t.Null()])),
  runtime_minutes: t.Optional(t.Union([t.Integer(), t.Null()])),
  source: t.Optional(t.String()),
  watched_at: t.Optional(t.String()),
});

// ─── Stats query ──────────────────────────────────────────────────────────────

export const StatsQuery = t.Object({
  year: t.Optional(t.String()),
  month: t.Optional(t.String()),
});
