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
  pilot: { id: string; name: string; alias: string | null; kartNumber: number | null };
}

export interface ChampionshipData {
  year: number;
  standings: Record<string, Standing[]>;
}

export const championshipApi = {
  get: () => api.get<ChampionshipData>('/championship'),
  getByYearCategory: (year: number, category: Category) =>
    api.get<{ year: number; category: Category; standings: Standing[] }>(
      `/championship/${year}/${category}`,
    ),
};
