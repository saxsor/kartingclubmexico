import { api } from './client';
import { Category } from './events.api';
import { buildPaginationQuery, PaginatedResponse, PaginationParams } from './pagination';

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

export type InscriptionStatus = 'PENDING_PAYMENT' | 'RECEIPT_SUBMITTED' | 'PAID';

export interface Inscription {
  id: string;
  eventId: string;
  pilotId: string;
  category: Category;
  kartNumber: number | null;
  kartNotes: string | null;
  engine: string | null;
  companions: number;
  status: InscriptionStatus;
  notes: string | null;
  receiptPath: string | null;
  selfRegistered: boolean;
  exentoCarrera: boolean;
  exentoComida: boolean;
  requiredServiceFee: number;
  requiredFoodFee: number;
  totalRequired: number;
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
  kartNumber: number | null;
  confirmedAt: string;
  confirmedBy: string | null;
  hasDebt: boolean;
}

export interface SelfRegisterData {
  pilotId?: string;
  name?: string;
  alias?: string;
  email?: string;
  phone?: string;
  kartNumber?: string;
  category: Category;
  notes?: string;
  companions?: number;
}

export interface SelfRegisterResponse {
  inscription: Inscription;
  transferInfo: string | null;
  serviceFee: string;
  foodFee: string;
  companions: number;
}

function uploadReceiptFetch(slug: string, id: string, file: File): Promise<Inscription> {
  const formData = new FormData();
  formData.append('receipt', file);
  const csrf = getCsrfToken();
  const headers: Record<string, string> = {};
  if (csrf) headers['X-CSRF-Token'] = csrf;
  return fetch(`/api/events/${slug}/inscriptions/${id}/receipt`, {
    method: 'POST',
    headers,
    credentials: 'include',
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
  list: (slug: string, params?: PaginationParams) =>
    api.get<PaginatedResponse<Inscription>>(`/events/${slug}/inscriptions${buildPaginationQuery(params ?? {})}`),
  get: (slug: string, id: string) => api.get<Inscription>(`/events/${slug}/inscriptions/${id}`),
  create: (slug: string, data: { pilotId: string; category: Category; kartNumber?: number; notes?: string; companions?: number; engine?: string }) =>
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
