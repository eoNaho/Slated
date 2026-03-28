import { Type as t } from "@sinclair/typebox";

export const ListNotificationsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  unread: t.Optional(t.String()),
});

export const NotificationType = t.Union([
  t.Literal("follow"),
  t.Literal("like"),
  t.Literal("comment"),
  t.Literal("achievement"),
  t.Literal("story_reaction"),
  t.Literal("story_reply"),
  t.Literal("story_mention"),
  t.Literal("club_invite"),
  t.Literal("dm"),
  t.Literal("system"),
  t.Literal("moderation_warning"),
  t.Literal("content_hidden"),
  t.Literal("content_restored"),
  t.Literal("account_suspended"),
]);
