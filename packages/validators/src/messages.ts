import { Type as t } from "@sinclair/typebox";

export const ConversationType = t.Union([
  t.Literal("dm"),
  t.Literal("group"),
]);

export const CreateConversationBody = t.Object({
  type: ConversationType,
  participantIds: t.Array(t.String(), { minItems: 1 }),
  name: t.Optional(t.String({ maxLength: 100 })),
});

export const SendMessageBody = t.Object({
  content: t.String({ minLength: 1, maxLength: 4000 }),
  type: t.Optional(
    t.Union([
      t.Literal("text"),
      t.Literal("story_reply"),
      t.Literal("image"),
    ])
  ),
  metadata: t.Optional(t.Any()),
  replyToId: t.Optional(t.String()),
});

export const ListMessagesQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  before: t.Optional(t.String()),
});

export const ListConversationsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

export const DmSettingsBody = t.Object({
  allowDmsFrom: t.Optional(
    t.Union([
      t.Literal("everyone"),
      t.Literal("followers"),
      t.Literal("following"),
      t.Literal("mutual"),
      t.Literal("nobody"),
    ])
  ),
  showReadReceipts: t.Optional(t.Boolean()),
  showTypingIndicator: t.Optional(t.Boolean()),
});

export const StoryReplyMessageBody = t.Object({
  storyId: t.String(),
  content: t.String({ minLength: 1, maxLength: 1000 }),
});
