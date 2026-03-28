import { Type as t } from "@sinclair/typebox";
import { CommentTargetType, PaginationQuery } from "./common";

export const ListCommentsQuery = t.Object({
  target_type: t.Union([t.Literal("review"), t.Literal("list")]),
  target_id: t.String(),
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

export const ListRepliesQuery = t.Object({
  limit: t.Optional(t.String()),
});

export const CreateCommentBody = t.Object({
  target_type: t.Union([t.Literal("review"), t.Literal("list")]),
  target_id: t.String(),
  parent_id: t.Optional(t.String()),
  content: t.String({ minLength: 1, maxLength: 2000 }),
});

export { CommentTargetType };
