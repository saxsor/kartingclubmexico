import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  events: {
    all: ['events'] as const,
    list: (params?: unknown) => ['events', 'list', params ?? {}] as const,
    detail: (slug: string) => ['events', 'detail', slug] as const,
  },
  pilots: {
    all: ['pilots'] as const,
    list: (params?: unknown) => ['pilots', 'list', params ?? {}] as const,
    detail: (id: string) => ['pilots', 'detail', id] as const,
    history: (id: string) => ['pilots', 'history', id] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params?: unknown) => ['users', 'list', params ?? {}] as const,
  },
  inscriptions: {
    all: ['inscriptions'] as const,
    list: (slug: string, params?: unknown) => ['inscriptions', 'list', slug, params ?? {}] as const,
  },
  payments: {
    all: ['payments'] as const,
    cashbox: (slug: string, params?: unknown) => ['payments', 'cashbox', slug, params ?? {}] as const,
  },
  checkin: {
    all: ['checkin'] as const,
    list: (slug: string) => ['checkin', 'list', slug] as const,
  },
  grids: {
    all: ['grids'] as const,
    list: (slug: string) => ['grids', 'list', slug] as const,
  },
  races: {
    all: ['races'] as const,
    list: (slug: string) => ['races', 'list', slug] as const,
    detail: (slug: string, raceId: string) => ['races', 'detail', slug, raceId] as const,
  },
  results: {
    byCategory: (slug: string, category: string) => ['results', 'by-category', slug, category] as const,
  },
  championships: {
    all: ['championships'] as const,
    list: () => ['championships', 'list'] as const,
    detail: (id: string) => ['championships', 'detail', id] as const,
    standings: (id: string, category: string) => ['championships', 'standings', id, category] as const,
    unassigned: () => ['championships', 'unassigned-events'] as const,
  },
};
