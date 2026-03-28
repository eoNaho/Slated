/**
 * Response helpers para padronizar os shapes de resposta da API.
 * Substitui os 12 formatos diferentes encontrados nas routes.
 */

export function ok<T>(data: T) {
  return { data };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    data: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: (page - 1) * limit + items.length < total,
    hasPrev: page > 1,
  };
}

export function success(message?: string) {
  return { success: true as const, ...(message ? { message } : {}) };
}
