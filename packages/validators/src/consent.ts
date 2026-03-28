import { Type as t } from "@sinclair/typebox";

export const AcceptConsentBody = t.Object({
  termsVersionId: t.Optional(t.String()),
  privacyVersionId: t.Optional(t.String()),
  method: t.Optional(
    t.Union([
      t.Literal("signup"),
      t.Literal("reaccept"),
      t.Literal("oauth_signup"),
    ])
  ),
});
