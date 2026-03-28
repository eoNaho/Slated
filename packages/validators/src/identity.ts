import { Type as t } from "@sinclair/typebox";

export const SetFrameBody = t.Object({
  frameId: t.Union([t.String(), t.Null()]),
});

export const SetTitleBody = t.Object({
  titleId: t.Union([t.String(), t.Null()]),
});

export const UpdateAppearanceBody = t.Object({
  accentColor: t.Optional(t.Union([t.String(), t.Null()])),
  profileTheme: t.Optional(t.Union([t.String(), t.Null()])),
  showcasedBadges: t.Optional(t.Array(t.String())),
});
