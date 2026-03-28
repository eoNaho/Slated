import { Type as t } from "@sinclair/typebox";

export const CheckoutBody = t.Object({
  priceId: t.String(),
  plan: t.Optional(t.Union([t.Literal("pro"), t.Literal("ultra")])),
});
