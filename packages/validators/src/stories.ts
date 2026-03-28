import { Type as t } from "@sinclair/typebox";

export const StoryVisibility = t.Union([
  t.Literal("public"),
  t.Literal("followers"),
  t.Literal("close_friends"),
]);

export const StoryType = t.Union([
  t.Literal("watch"),
  t.Literal("list"),
  t.Literal("rating"),
  t.Literal("poll"),
  t.Literal("hot_take"),
  t.Literal("rewind"),
  t.Literal("countdown"),
  t.Literal("quiz"),
  t.Literal("question_box"),
]);

export const CreateStoryBody = t.Object({
  type: t.String(),
  content: t.Any(),
  expires_at: t.Optional(t.String()),
  visibility: t.Optional(t.String()),
  slides: t.Optional(t.Any()),
});

export const ListStoriesQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

export const StoryReactBody = t.Object({
  reaction: t.String(),
  text_reply: t.Optional(t.String({ maxLength: 500 })),
});

export const StoryPollVoteBody = t.Object({
  option_index: t.Number({ minimum: 0, maximum: 3 }),
});

export const StoryPinBody = t.Object({
  pinned: t.Optional(t.Boolean()),
});

export const StoryArchiveBody = t.Object({
  archived: t.Optional(t.Boolean()),
});

export const StoryQuizAnswerBody = t.Object({
  answer_index: t.Number({ minimum: 0, maximum: 3 }),
});

export const StoryQuestionResponseBody = t.Object({
  response: t.String({ maxLength: 500 }),
});

// Story highlights

export const CreateHighlightBody = t.Object({
  name: t.String({ maxLength: 50 }),
  cover_image_url: t.Optional(t.String()),
  story_ids: t.Optional(t.Array(t.String())),
});

export const UpdateHighlightBody = t.Object({
  name: t.Optional(t.String({ maxLength: 50 })),
  cover_image_url: t.Optional(t.Union([t.String(), t.Null()])),
  position: t.Optional(t.Number()),
});

export const AddHighlightStoriesBody = t.Object({
  story_ids: t.Array(t.String()),
});

export const HighlightItemParams = t.Object({
  id: t.String(),
  storyId: t.String(),
});
