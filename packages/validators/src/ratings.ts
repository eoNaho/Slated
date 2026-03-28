import { Type as t } from "@sinclair/typebox";

export const RateMediaBody = t.Object({
  mediaId: t.String(),
  rating: t.Number({ minimum: 0.5, maximum: 5 }),
});
