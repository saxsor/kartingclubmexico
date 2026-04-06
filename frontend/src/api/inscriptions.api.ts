import { api } from './client';
import { useAuthStore } from '../store/auth.store';
import { Category } from './events.api';

export type InscriptionStatus = 'PENDING_PAYMENT' | 'RECEIPT_SUBMITTED' | 'PAID';

export interface Inscription {
  id: string;
  eventId: string;
  pilotId: string;
  category: Category;
  kartNumber: number | null;
  status: InscriptionStatus;
  notes: string | null;
  receiptPath: string | null;
  selfRegistered: boolean;
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

export interface SelfRegisterData {
  name: string;
  alias?: string;
  email?: string;
  phone?: string;
  kartNumber?: string;
  category: Category;
  notes?: string;
}

export interface SelfRegisterResponse {
  inscription: Inscription;
  transferInfo: string | null;
  serviceFee: string;
  foodFee: string;
}

function uploadReceiptFetch(slug: string, id: string, file: File): Promise<Inscription> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  formData.append('receipt', file);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`/api/events/${slug}/inscriptions/${id}/receipt`, {
    method: 'POST',
    headers,
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    return res.json();
  });
}

export const inscriptionsApi = {
  list: (slug: string) => api.get<Inscription[]>(`/events/${slug}/inscriptions`),
  get: (slug: string, id: string) => api.get<Inscription>(`/events/${slug}/inscriptions/${id}`),
  create: (slug: string, data: { pilotId: string; category: Category; kartNumber?: number; notes?: string }) =>
    api.post<Inscription>(`/events/${slug}/inscriptions`, data),
  update: (slug: string, id: string, data: Partial<Inscription>) =>
    api.put<Inscription>(`/events/${slug}/inscriptions/${id}`, data),
  delete: (slug: string, id: string) => api.delete<void>(`/events/${slug}/inscriptions/${id}`),
  selfRegister: (slug: string, data: SelfRegisterData) =>
    api.post<SelfRegisterResponse>(`/events/${slug}/self-register`, data),
  uploadReceipt: uploadReceiptFetch,
  approveReceipt: (slug: string, id: string) =>
    api.post<Inscription>(`/events/${slug}/inscriptions/${id}/approve`),
  rejectReceipt: (slug: string, id: string) =>
    api.post<Inscription>(`/events/${slug}/inscriptions/${id}/reject`),
};
