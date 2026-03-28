import { Type as t } from "@sinclair/typebox";

export const RecommendationsMediaQuery = t.Object({
  limit: t.Optional(t.String()),
  type: t.Optional(
    t.Union([t.Literal("movie"), t.Literal("series"), t.Literal("all")])
  ),
  exclude_watched: t.Optional(t.String()),
});

export const ExplanationsQuery = t.Object({
  mediaIds: t.Optional(t.String()),
});

export const RecFeedbackBody = t.Object({
  recType: t.Union([t.Literal("media"), t.Literal("user")]),
  targetId: t.String(),
  feedback: t.Union([
    t.Literal("not_interested"),
    t.Literal("already_watched"),
    t.Literal("loved_it"),
    t.Literal("not_my_taste"),
  ]),
  source: t.Optional(t.String()),
  context: t.Optional(t.String()),
});

export const OnboardingBody = t.Object({
  genreIds: t.Array(t.String()),
  seedMediaIds: t.Array(t.String()),
});
