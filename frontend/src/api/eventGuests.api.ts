import { api } from './client';

export interface EventGuest {
  id: string;
  eventId: string;
  name: string | null;
  count: number;
  isPaid: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const eventGuestsApi = {
  list: (slug: string) => api.get<EventGuest[]>(`/events/${slug}/guests`),
  add: (slug: string, data: { name?: string; count?: number; notes?: string }) =>
    api.post<EventGuest>(`/events/${slug}/guests`, data),
  update: (slug: string, guestId: string, data: { name?: string; count?: number; isPaid?: boolean; notes?: string }) =>
    api.put<EventGuest>(`/events/${slug}/guests/${guestId}`, data),
  delete: (slug: string, guestId: string) => api.delete<void>(`/events/${slug}/guests/${guestId}`),
};
