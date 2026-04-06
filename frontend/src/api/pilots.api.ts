import { api } from './client';
import { useAuthStore } from '../store/auth.store';

export interface Pilot {
  id: string;
  name: string;
  alias: string | null;
  kartNumber: number | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
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
  uploadPhoto: (id: string, file: File): Promise<Pilot> => {
    const token = useAuthStore.getState().token;
    const fd = new FormData();
    fd.append('photo', file);
    return fetch(`/api/pilots/${id}/photo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(async (r) => {
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? 'Error al subir foto'); }
      return r.json() as Promise<Pilot>;
    });
  },
  deletePhoto: (id: string) => api.delete<Pilot>(`/pilots/${id}/photo`),
};
