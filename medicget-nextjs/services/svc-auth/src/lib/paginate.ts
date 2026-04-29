export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function parsePagination(searchParams: URLSearchParams, defaults = { page: 1, pageSize: 20 }): PaginationParams {
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? String(defaults.page),     10) || defaults.page);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? String(defaults.pageSize), 10) || defaults.pageSize));
  return { page, pageSize };
}

export function paginate<T>(data: T[], total: number, { page, pageSize }: PaginationParams): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export function toSkipTake({ page, pageSize }: PaginationParams): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
