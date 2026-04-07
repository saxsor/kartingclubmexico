import { api } from './client';
import { Category } from './events.api';

export interface Standing {
  id: string;
  year: number;
  pilotId: string;
  category: Category;
  totalPoints: number;
  position: number | null;
  eventsCount: number;
  gap: number;
  pilot: { id: string; name: string; alias: string | null; kartNumber: number | null; photoUrl: string | null };
}

export interface ChampionshipData {
  year: number;
  standings: Record<string, Standing[]>;
}

export interface Championship {
  id: string;
  name: string;
  year: number;
  createdAt: string;
  updatedAt: string;
  _count?: { events: number };
}

export interface ChampionshipEvent {
  id: string;
  name: string;
  slug: string;
  date: string;
  status: string;
  year: number;
  eventCategories?: { category: Category }[];
}

export interface ChampionshipDetail extends Championship {
  events: ChampionshipEvent[];
}

export interface ChampionshipStandingRow {
  position: number;
  pilotId: string;
  pilotName: string;
  alias: string | null;
  kartNumber: number | null;
  photoUrl: string | null;
  eventPoints: Record<string, number>;
  totalPoints: number;
  gap: number;
}

export interface ChampionshipStandingsData {
  championship: { id: string; name: string; year: number };
  category: Category;
  events: ChampionshipEvent[];
  allEvents: ChampionshipEvent[];
  standings: ChampionshipStandingRow[];
}

export const championshipApi = {
  // Legacy year-based (backward compat)
  get: () => api.get<ChampionshipData>('/championship'),
  getByYearCategory: (year: number, category: Category) =>
    api.get<{ year: number; category: Category; standings: Standing[] }>(
      `/championship/${year}/${category}`,
    ),

  // New championship CRUD
  list: () => api.get<Championship[]>('/championships'),
  create: (data: { name: string; year?: number }) => api.post<Championship>('/championships', data),
  getById: (id: string) => api.get<ChampionshipDetail>(`/championships/${id}`),
  update: (id: string, data: { name?: string; year?: number }) =>
    api.put<Championship>(`/championships/${id}`, data),
  delete: (id: string) => api.delete<void>(`/championships/${id}`),
  getStandings: (id: string, category: Category) =>
    api.get<ChampionshipStandingsData>(`/championships/${id}/standings/${category}`),
  getUnassignedEvents: () => api.get<ChampionshipEvent[]>('/championships/unassigned-events'),
};
