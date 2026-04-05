import { api } from './client';
import { Category } from './events.api';

export interface GridPosition {
  id: string;
  position: number;
  inscription: {
    id: string;
    kartNumber: number | null;
    pilot: { id: string; name: string; alias: string | null };
  };
}

export interface StartGrid {
  id: string;
  eventCategoryId: string;
  eventCategory?: { category: string };
  drawnAt: string;
  drawnBy: string | null;
  positions: GridPosition[];
}

export const gridApi = {
  getAll: (slug: string) => api.get<StartGrid[]>(`/events/${slug}/grid`),
  getByCategory: (slug: string, category: Category) =>
    api.get<StartGrid | null>(`/events/${slug}/grid/${category}`),
  draw: (slug: string, category: Category) =>
    api.post<StartGrid>(`/events/${slug}/grid/${category}/draw`),
  delete: (slug: string, category: Category) =>
    api.delete<void>(`/events/${slug}/grid/${category}`),
};
