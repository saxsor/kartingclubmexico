import { api } from './client';
import { Category } from './events.api';

export type RaceStatus = 'PENDING' | 'IN_PROGRESS' | 'FINISHED';
export type ResultStatus = 'FINISHED' | 'DNS' | 'DNF' | 'DSQ';

export interface RaceResult {
  id: string;
  raceId: string;
  inscriptionId: string;
  position: number | null;
  lapsCompleted: number;
  status: ResultStatus;
  basePoints: number;
  penaltyPoints: number;
  finalPoints: number;
  inscription: {
    id: string;
    kartNumber: number | null;
    pilot: { id: string; name: string; alias: string | null };
  };
  penalties: Penalty[];
}

export interface Penalty {
  id: string;
  raceResultId: string;
  type: 'POSITIONS' | 'POINTS';
  amount: number;
  reason: string;
  createdAt: string;
}

export interface Race {
  id: string;
  eventId: string;
  category: Category;
  number: number;
  laps: number;
  status: RaceStatus;
  startedAt: string | null;
  finishedAt: string | null;
  results: RaceResult[];
}

export const racesApi = {
  list: (slug: string) => api.get<Race[]>(`/events/${slug}/races`),
  get: (slug: string, raceId: string) => api.get<Race>(`/events/${slug}/races/${raceId}`),
  create: (slug: string, data: { category: Category; number: number; laps?: number }) =>
    api.post<Race>(`/events/${slug}/races`, data),
  patchStatus: (slug: string, raceId: string, status: RaceStatus) =>
    api.patch<Race>(`/events/${slug}/races/${raceId}/status`, { status }),
  saveResults: (raceId: string, results: { inscriptionId: string; position: number | null; lapsCompleted: number; status: ResultStatus }[]) =>
    api.put<Race>(`/races/${raceId}/results`, { results }),
  addPenalty: (raceId: string, resultId: string, data: { type: string; amount: number; reason: string }) =>
    api.post<Penalty>(`/races/${raceId}/results/${resultId}/penalties`, data),
  deletePenalty: (raceId: string, penaltyId: string) =>
    api.delete<void>(`/races/${raceId}/penalties/${penaltyId}`),
};
