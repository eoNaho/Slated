import { Type as t } from "@sinclair/typebox";

export const ListListsQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  user_id: t.Optional(t.String()),
  membership_media_id: t.Optional(t.String()),
});

export const UsernameSlugParams = t.Object({
  username: t.String(),
  slug: t.String(),
});

export const CreateListBody = t.Object({
  name: t.String({ minLength: 3 }),
  description: t.Optional(t.String()),
  is_public: t.Optional(t.Boolean()),
  is_ranked: t.Optional(t.Boolean()),
  item_ids: t.Optional(t.Array(t.String())),
});

export const UpdateListBody = t.Object({
  name: t.Optional(t.String({ minLength: 3 })),
  description: t.Optional(t.String()),
  is_public: t.Optional(t.Boolean()),
  is_ranked: t.Optional(t.Boolean()),
});

export const AddListItemBody = t.Object({
  media_id: t.String(),
  note: t.Optional(t.String()),
});

export const ListItemParams = t.Object({
  id: t.String(),
  mediaId: t.String(),
});

// ─── Watchlist ────────────────────────────────────────────────────────────────

export const AddWatchlistBody = t.Object({
  media_id: t.String(),
});

// ─── Diary ────────────────────────────────────────────────────────────────────

export const CreateDiaryEntryBody = t.Object({
  media_id: t.String(),
  watched_at: t.Optional(t.String()),
  rating: t.Optional(t.Number({ minimum: 0.5, maximum: 5 })),
  is_rewatch: t.Optional(t.Boolean()),
  notes: t.Optional(t.String()),
  review_title: t.Optional(t.String()),
  contains_spoilers: t.Optional(t.Boolean()),
});

export const UpdateDiaryEntryBody = t.Object({
  watched_at: t.Optional(t.String()),
  rating: t.Optional(t.Union([t.Number({ minimum: 0.5, maximum: 5 }), t.Null()])),
  is_rewatch: t.Optional(t.Boolean()),
  notes: t.Optional(t.Union([t.String(), t.Null()])),
});

// ─── Favorites ────────────────────────────────────────────────────────────────

export const AddFavoriteBody = t.Object({
  mediaId: t.String(),
  position: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
});

export const ReorderFavoritesBody = t.Object({
  order: t.Array(
    t.Object({
      mediaId: t.String(),
      position: t.Number({ minimum: 1 }),
    })
  ),
});
