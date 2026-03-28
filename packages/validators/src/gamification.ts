import { Type as t } from "@sinclair/typebox";

export const LimitQuery = t.Object({
  limit: t.Optional(t.String()),
});
