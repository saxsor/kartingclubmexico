import { Request } from 'express';

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export function getPaginationParams(req: Request): PaginationParams {
  const rawPage = Number(req.query.page);
  const rawPageSize = Number(req.query.pageSize);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : DEFAULT_PAGE;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0
    ? Math.min(Math.floor(rawPageSize), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export function getPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
