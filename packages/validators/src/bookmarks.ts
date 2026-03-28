import { Type as t } from "@sinclair/typebox";
import { ContentTargetType, TargetParams } from "./common";

export const CreateBookmarkBody = t.Object({
  targetType: ContentTargetType,
  targetId: t.String(),
  note: t.Optional(t.String()),
});

export const BookmarkParams = TargetParams;

export const ListBookmarksQuery = t.Object({
  targetType: t.Optional(ContentTargetType),
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});
