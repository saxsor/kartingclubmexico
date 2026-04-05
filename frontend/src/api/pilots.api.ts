import { api } from './client';

export interface Pilot {
  id: string;
  name: string;
  alias: string | null;
  kartNumber: number | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const pilotsApi = {
  list: () => api.get<Pilot[]>('/pilots'),
  get: (id: string) => api.get<Pilot>(`/pilots/${id}`),
  getHistory: (id: string) => api.get<unknown>(`/pilots/${id}/history`),
  create: (data: Partial<Pilot>) => api.post<Pilot>('/pilots', data),
  update: (id: string, data: Partial<Pilot>) => api.put<Pilot>(`/pilots/${id}`, data),
  delete: (id: string) => api.delete<void>(`/pilots/${id}`),
};
