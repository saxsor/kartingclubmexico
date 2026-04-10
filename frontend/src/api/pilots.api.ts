import { api, uploadWithAuth } from './client';
import { buildPaginationQuery, PaginatedResponse, PaginationParams } from './pagination';


export interface Pilot {
  id: string;
  name: string;
  alias: string | null;
  kartNumber: number | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  engine: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const pilotsApi = {
  list: (params?: PaginationParams) =>
    api.get<PaginatedResponse<Pilot>>(`/pilots${buildPaginationQuery(params ?? {})}`),
  get: (id: string) => api.get<Pilot>(`/pilots/${id}`),
  getHistory: (id: string) => api.get<unknown>(`/pilots/${id}/history`),
  create: (data: Partial<Pilot>) => api.post<Pilot>('/pilots', data),
  update: (id: string, data: Partial<Pilot>) => api.put<Pilot>(`/pilots/${id}`, data),
  delete: (id: string) => api.delete<void>(`/pilots/${id}`),
  uploadPhoto: (id: string, file: File): Promise<Pilot> => {
    const fd = new FormData();
    fd.append('photo', file);
    return uploadWithAuth<Pilot>(`/pilots/${id}/photo`, fd);
  },
  deletePhoto: (id: string) => api.delete<Pilot>(`/pilots/${id}/photo`),
};
