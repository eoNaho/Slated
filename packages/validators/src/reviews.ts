import { Type as t } from "@sinclair/typebox";
import { PaginationQuery } from "./common";

export const ListReviewsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  media_id: t.Optional(t.String()),
  user_id: t.Optional(t.String()),
  season_id: t.Optional(t.String()),
  episode_id: t.Optional(t.String()),
  source: t.Optional(t.String()),
});

export const CreateReviewBody = t.Object({
  media_id: t.String(),
  season_id: t.Optional(t.String()),
  episode_id: t.Optional(t.String()),
  content: t.String({ minLength: 10 }),
  rating: t.Optional(t.Number({ minimum: 0.5, maximum: 5 })),
  contains_spoilers: t.Optional(t.Boolean()),
  title: t.Optional(t.String()),
});

export const UpdateReviewBody = t.Object({
  content: t.Optional(t.String({ minLength: 10 })),
  rating: t.Optional(t.Number({ minimum: 0.5, maximum: 5 })),
  contains_spoilers: t.Optional(t.Boolean()),
  title: t.Optional(t.String()),
});

// Re-export para conveniência
export { PaginationQuery };
