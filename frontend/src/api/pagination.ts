export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function buildPaginationQuery<T extends object>(params: T) {
  const searchParams = new URLSearchParams();

  Object.entries(params as Record<string, string | number | boolean | undefined>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}
