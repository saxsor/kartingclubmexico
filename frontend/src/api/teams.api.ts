import { api, uploadWithAuth } from './client';

export interface Team {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  logoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { pilots: number };
}

export interface TeamDetail extends Team {
  pilots: {
    id: string;
    name: string;
    alias: string | null;
    kartNumber: number | null;
    photoUrl: string | null;
  }[];
}

export const teamsApi = {
  search: (q: string) => api.get<Team[]>(`/teams/search?q=${encodeURIComponent(q)}`),
  list: () => api.get<Team[]>('/teams'),
  get: (id: string) => api.get<TeamDetail>(`/teams/${id}`),
  create: (name: string) => api.post<Team>('/teams', { name }),
  update: (id: string, data: { name?: string; active?: boolean }) =>
    api.put<Team>(`/teams/${id}`, data),
  uploadLogo: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return uploadWithAuth<Team>(`/teams/${id}/logo`, fd);
  },
  deleteLogo: (id: string) => api.delete<Team>(`/teams/${id}/logo`),
};
