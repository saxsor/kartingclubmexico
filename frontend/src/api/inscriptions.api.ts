import { api } from './client';
import { Category } from './events.api';

export type InscriptionStatus = 'PENDING_PAYMENT' | 'PAID';

export interface Inscription {
  id: string;
  eventId: string;
  pilotId: string;
  category: Category;
  kartNumber: number | null;
  status: InscriptionStatus;
  notes: string | null;
  pilot: { id: string; name: string; alias: string | null; kartNumber: number | null };
  payments: Payment[];
  checkIn: CheckIn | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  inscriptionId: string;
  type: 'SERVICE_FEE' | 'FOOD_FEE' | 'OTHER';
  amount: string;
  paidAt: string;
  notes: string | null;
  createdBy: string | null;
}

export interface CheckIn {
  id: string;
  inscriptionId: string;
  kartNumber: number;
  confirmedAt: string;
  confirmedBy: string | null;
}

export const inscriptionsApi = {
  list: (slug: string) => api.get<Inscription[]>(`/events/${slug}/inscriptions`),
  get: (slug: string, id: string) => api.get<Inscription>(`/events/${slug}/inscriptions/${id}`),
  create: (slug: string, data: { pilotId: string; category: Category; kartNumber?: number; notes?: string }) =>
    api.post<Inscription>(`/events/${slug}/inscriptions`, data),
  update: (slug: string, id: string, data: Partial<Inscription>) =>
    api.put<Inscription>(`/events/${slug}/inscriptions/${id}`, data),
  delete: (slug: string, id: string) => api.delete<void>(`/events/${slug}/inscriptions/${id}`),
};
