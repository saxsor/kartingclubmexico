import { api } from './client';

export interface RevenueByEvent {
  slug: string;
  name: string;
  date: string;
  status: string;
  serviceFee: number;
  foodFee: number;
  other: number;
  total: number;
}

export interface ParticipationByEvent {
  slug: string;
  name: string;
  date: string;
  categories: Record<string, number>;
  total: number;
}

export interface StandingEntry {
  position: number | null;
  pilotName: string;
  alias: string | null;
  totalPoints: number;
  eventsCount: number;
}

export interface DashboardAnalytics {
  revenueByEvent: RevenueByEvent[];
  participationByEvent: ParticipationByEvent[];
  standingsByCategory: Record<string, StandingEntry[]>;
  year: number;
}

export const analyticsApi = {
  getDashboard: () => api.get<DashboardAnalytics>('/analytics/dashboard'),
};
