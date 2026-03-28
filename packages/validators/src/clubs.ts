import { Type as t } from "@sinclair/typebox";

// ── Query schemas ─────────────────────────────────────────────────────────────

export const ListClubsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  category: t.Optional(t.String()),
  search: t.Optional(t.String()),
});

export const ListClubPostsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  pinned: t.Optional(t.String()),
  sort: t.Optional(t.String()),
  timeframe: t.Optional(t.String()),
});

export const ListClubEventsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  upcoming: t.Optional(t.String()),
});

// ── Param schemas ─────────────────────────────────────────────────────────────

export const ClubMemberParams = t.Object({
  id: t.String(),
  userId: t.String(),
});

export const ClubRequestParams = t.Object({
  id: t.String(),
  requestId: t.String(),
});

export const InviteIdParam = t.Object({ inviteId: t.String() });

export const ClubItemParams = t.Object({
  id: t.String(),
  itemId: t.String(),
});

export const ClubEventParams = t.Object({
  id: t.String(),
  eventId: t.String(),
});

export const ClubPostParams = t.Object({
  id: t.String(),
  postId: t.String(),
});

export const ClubPostCommentParams = t.Object({
  id: t.String(),
  postId: t.String(),
  commentId: t.String(),
});

export const ClubFlairParams = t.Object({
  id: t.String(),
  flairId: t.String(),
});

export const ClubPollParams = t.Object({
  id: t.String(),
  pollId: t.String(),
});

// ── Body schemas ──────────────────────────────────────────────────────────────

export const CreateClubBody = t.Object({
  name: t.String({ minLength: 3, maxLength: 60 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  isPublic: t.Optional(t.Boolean()),
  allowJoinRequests: t.Optional(t.Boolean()),
  categories: t.Optional(t.Array(t.String(), { maxItems: 3 })),
});

export const UpdateClubBody = t.Object({
  name: t.Optional(t.String({ minLength: 3, maxLength: 60 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  isPublic: t.Optional(t.Boolean()),
  allowJoinRequests: t.Optional(t.Boolean()),
  categories: t.Optional(t.Array(t.String(), { maxItems: 3 })),
});

export const UpdateMemberRoleBody = t.Object({
  role: t.Union([t.Literal("moderator"), t.Literal("member")]),
});

export const ClubUsernameBody = t.Object({ username: t.String() });

export const JoinRequestBody = t.Object({
  message: t.Optional(t.String({ maxLength: 300 })),
});

export const AddClubWatchlistBody = t.Object({
  mediaId: t.Optional(t.String()),
  mediaTitle: t.String({ minLength: 1, maxLength: 200 }),
  mediaPosterPath: t.Optional(t.String()),
  mediaType: t.Union([t.Literal("movie"), t.Literal("series")]),
  note: t.Optional(t.String({ maxLength: 300 })),
});

export const SetWatchedBody = t.Object({ isWatched: t.Boolean() });

export const CreateClubEventBody = t.Object({
  title: t.String({ minLength: 3, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  eventType: t.Optional(t.Union([t.Literal("watch"), t.Literal("discussion")])),
  scheduledAt: t.String(),
  mediaId: t.Optional(t.String()),
  mediaTitle: t.Optional(t.String()),
  mediaPosterPath: t.Optional(t.String()),
  meetLink: t.Optional(t.String({ maxLength: 300 })),
});

export const UpdateClubEventBody = t.Object({
  title: t.Optional(t.String({ minLength: 3, maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  eventType: t.Optional(t.Union([t.Literal("watch"), t.Literal("discussion")])),
  scheduledAt: t.Optional(t.String()),
  meetLink: t.Optional(t.String({ maxLength: 300 })),
  mediaId: t.Optional(t.String()),
  mediaTitle: t.Optional(t.String()),
  mediaPosterPath: t.Optional(t.String()),
});

export const RsvpBody = t.Object({
  status: t.Union([t.Literal("going"), t.Literal("interested"), t.Literal("not_going")]),
});

export const CreateClubPostBody = t.Object({
  title: t.String({ minLength: 3, maxLength: 150 }),
  content: t.String({ minLength: 1, maxLength: 5000 }),
  mediaId: t.Optional(t.String()),
  mediaTitle: t.Optional(t.String()),
  isPinned: t.Optional(t.Boolean()),
  flair: t.Optional(t.String({ maxLength: 50 })),
  flairColor: t.Optional(t.String({ maxLength: 20 })),
});

export const UpdateClubPostBody = t.Object({
  title: t.Optional(t.String({ minLength: 3, maxLength: 150 })),
  content: t.Optional(t.String({ minLength: 1, maxLength: 5000 })),
  flair: t.Optional(t.Union([t.String({ maxLength: 50 }), t.Null()])),
  flairColor: t.Optional(t.Union([t.String({ maxLength: 20 }), t.Null()])),
});

export const PinPostBody = t.Object({ pinned: t.Boolean() });

export const VoteBody = t.Object({
  value: t.Union([t.Literal(1), t.Literal(-1)]),
});

export const ClubCommentBody = t.Object({
  content: t.String({ minLength: 1, maxLength: 1000 }),
  parentId: t.Optional(t.String()),
});

export const CreateFlairBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 50 }),
  color: t.String({ minLength: 4, maxLength: 20 }),
});

export const CreateClubPollBody = t.Object({
  question: t.String({ minLength: 5, maxLength: 300 }),
  expiresAt: t.Optional(t.String()),
  options: t.Array(
    t.Object({
      text: t.String({ minLength: 1, maxLength: 100 }),
      mediaId: t.Optional(t.String()),
      mediaPosterPath: t.Optional(t.String()),
    }),
    { minItems: 2, maxItems: 10 }
  ),
});

export const PollVoteBody = t.Object({ optionId: t.String() });

// Legacy aliases (kept for backward compatibility)
export const ClubContentQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  sort: t.Optional(t.String()),
});
