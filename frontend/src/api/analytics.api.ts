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

export interface ConstructorEntry {
  position: number | null;
  teamName: string;
  totalPoints: number;
  eventsCount: number;
}

export interface TeamsPerEvent {
  name: string;
  slug: string;
  equipos: number;
}

export interface FoodByEvent {
  slug: string;
  name: string;
  status: string;
  pilotos: number;
  staff: number;
  total: number;
}

export interface RecentPilot {
  id: string;
  name: string;
  alias: string | null;
  kartNumber: number | null;
  photoUrl: string | null;
  createdAt: string;
}

export interface RecentTeam {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { pilots: number };
}

export interface DashboardAnalytics {
  revenueByEvent: RevenueByEvent[];
  participationByEvent: ParticipationByEvent[];
  standingsByCategory: Record<string, StandingEntry[]>;
  constructorsByCategory: Record<string, ConstructorEntry[]>;
  totalTeams: number;
  avgTeamsPerEvent: number;
  teamsPerEvent: TeamsPerEvent[];
  foodByEvent: FoodByEvent[];
  recentPilots: RecentPilot[];
  recentTeams: RecentTeam[];
  year: number;
}

export const analyticsApi = {
  getDashboard: () => api.get<DashboardAnalytics>('/analytics/dashboard'),
};
