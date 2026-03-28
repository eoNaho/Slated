import { Type as t, type TSchema } from "@sinclair/typebox";

// ─── Envelopes de resposta padronizados ──────────────────────────────────────
// Substitui os 12 shapes diferentes encontrados na API

export const ApiResponseSchema = <T extends TSchema>(dataSchema: T) =>
  t.Object({ data: dataSchema });

export const PaginatedResponseSchema = <T extends TSchema>(itemSchema: T) =>
  t.Object({
    data: t.Array(itemSchema),
    total: t.Number(),
    page: t.Number(),
    limit: t.Number(),
    totalPages: t.Number(),
    hasNext: t.Boolean(),
    hasPrev: t.Boolean(),
  });

export const SuccessResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.Optional(t.String()),
});

export const ErrorResponseSchema = t.Object({
  error: t.String(),
  detail: t.Optional(t.String()),
});
