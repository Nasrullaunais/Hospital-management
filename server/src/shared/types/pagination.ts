/**
 * Standardized pagination types and helpers.
 *
 * All list endpoints must use this shape:
 *   { items: T[], pagination: { total, page, limit, pages } }
 */

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Parse page and limit from query params with safe defaults.
 */
export function parsePagination(query: { page?: unknown; limit?: unknown }): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build a standardized paginated API response body.
 */
export function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    items,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}
