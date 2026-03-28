import { Type as t } from "@sinclair/typebox";

export const SearchUsersQuery = t.Object({
  q: t.Optional(t.String()),
});

export const UpdateProfileBody = t.Object({
  displayName: t.Optional(t.String()),
  bio: t.Optional(t.String()),
  location: t.Optional(t.String()),
  website: t.Optional(t.String()),
  avatarUrl: t.Optional(t.String()),
  coverUrl: t.Optional(t.String()),
  coverPosition: t.Optional(t.String()),
  coverZoom: t.Optional(t.String()),
  bioExtended: t.Optional(
    t.Union([
      t.Object({
        headline: t.Optional(t.String()),
        location: t.Optional(t.String()),
        website: t.Optional(t.String()),
        links: t.Optional(
          t.Array(
            t.Object({
              label: t.String(),
              url: t.String(),
              icon: t.Optional(t.String()),
            })
          )
        ),
        quote: t.Optional(
          t.Union([
            t.Object({
              text: t.String(),
              author: t.Optional(t.String()),
              source: t.Optional(t.String()),
            }),
            t.Null(),
          ])
        ),
        moods: t.Optional(t.Array(t.String())),
        currentlyWatching: t.Optional(
          t.Union([
            t.Object({
              mediaId: t.String(),
              note: t.Optional(t.String()),
              startedAt: t.Optional(t.String()),
              progress: t.Optional(t.Number()),
            }),
            t.Null(),
          ])
        ),
        sections: t.Optional(
          t.Array(
            t.Object({
              title: t.String(),
              content: t.String(),
            })
          )
        ),
      }),
      t.Null(),
    ])
  ),
});

export const UpdateSocialLinksBody = t.Object({
  twitter: t.Optional(t.Union([t.String(), t.Null()])),
  instagram: t.Optional(t.Union([t.String(), t.Null()])),
  letterboxd: t.Optional(t.Union([t.String(), t.Null()])),
  imdb: t.Optional(t.Union([t.String(), t.Null()])),
});

export const ListFollowersQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

const VisibilitySection = t.Optional(
  t.Union([t.Literal("public"), t.Literal("followers"), t.Literal("private")])
);

export const UpdatePrivacyBody = t.Object({
  isPrivate: t.Optional(t.Boolean()),
  visibilityDiary: VisibilitySection,
  visibilityWatchlist: VisibilitySection,
  visibilityActivity: VisibilitySection,
  visibilityReviews: VisibilitySection,
  visibilityLists: VisibilitySection,
  visibilityLikes: VisibilitySection,
});

export const RequesterIdParam = t.Object({ requesterId: t.String() });

export const BlockUserBody = t.Object({ userId: t.String() });

export const TokenQuery = t.Object({ token: t.String() });

export const FriendIdParam = t.Object({ friendId: t.String() });

export const AddCloseFriendBody = t.Object({ friend_id: t.String() });
