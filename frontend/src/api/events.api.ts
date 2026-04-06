import { api } from './client';

export type EventStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'FINISHED';
export type Category = 'SHIFTER' | 'DOS_TIEMPOS' | 'FORMULA_MUNDIAL' | 'NUEVE_HP' | 'ROOKIES' | 'MINIS';

export interface EventCategory {
  id: string;
  eventId: string;
  category: Category;
  active: boolean;
}

export interface KartEvent {
  id: string;
  name: string;
  slug: string;
  date: string;
  description: string | null;
  status: EventStatus;
  year: number;
  serviceFee: string;
  foodFee: string;
  blockCheckInOnDebt: boolean;
  transferInfo: string | null;
  eventCategories: EventCategory[];
  createdAt: string;
  updatedAt: string;
}

export const eventsApi = {
  list: () => api.get<KartEvent[]>('/events'),
  get: (slug: string) => api.get<KartEvent>(`/events/${slug}`),
  create: (data: unknown) => api.post<KartEvent>('/events', data),
  update: (slug: string, data: unknown) => api.put<KartEvent>(`/events/${slug}`, data),
  delete: (slug: string) => api.delete<void>(`/events/${slug}`),
  patchStatus: (slug: string, status: EventStatus) =>
    api.patch<KartEvent>(`/events/${slug}/status`, { status }),
  getCategories: (slug: string) => api.get<EventCategory[]>(`/events/${slug}/categories`),
  updateCategories: (slug: string, categories: Category[]) =>
    api.put<EventCategory[]>(`/events/${slug}/categories`, { categories }),
};
