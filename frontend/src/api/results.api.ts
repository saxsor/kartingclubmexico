import { api } from './client';
import { Category } from './events.api';

export interface ClassificationEntry {
  position: number;
  pilotId: string;
  pilotName: string;
  alias: string | null;
  kartNumber: number | null;
  races: Record<number, number>;
  total: number;
  gap: number;
}

export interface CategoryResults {
  category: Category;
  races: number[];
  classification: ClassificationEntry[];
}

export const resultsApi = {
  getAll: (slug: string) => api.get<unknown>(`/events/${slug}/results`),
  getByCategory: (slug: string, category: Category) =>
    api.get<CategoryResults>(`/events/${slug}/results/${category}`),
  exportUrl: (slug: string, format: 'pdf' | 'csv', category?: Category) => {
    const params = new URLSearchParams({ format });
    if (category) params.set('category', category);
    return `/api/events/${slug}/results/export?${params.toString()}`;
  },
};
