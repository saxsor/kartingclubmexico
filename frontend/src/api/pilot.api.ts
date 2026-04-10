import { api, uploadWithAuth } from './client';

export interface PilotProfile {
  id: string;
  name: string;
  alias: string | null;
  kartNumber: number | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  engine: string | null;
  inscriptions: PilotInscription[];
  standings: PilotStanding[];
}

export interface PilotInscription {
  id: string;
  category: string;
  kartNumber: number | null;
  engine: string | null;
  companions: number;
  status: 'PENDING_PAYMENT' | 'RECEIPT_SUBMITTED' | 'PAID';
  event: {
    id: string;
    name: string;
    slug: string;
    date: string;
    status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'FINISHED';
    serviceFee: string;
    foodFee: string;
  };
  payments: { id: string; type: string; amount: string; paidAt: string }[];
  checkIn: { id: string; kartNumber: number; confirmedAt: string } | null;
}

export interface PilotStanding {
  id: string;
  year: number;
  category: string;
  totalPoints: number;
  position: number | null;
  eventsCount: number;
}

export const pilotApi = {
  requestAccess: (email: string) =>
    api.post<{ message: string }>('/pilot/request-access', { email }),

  verifyAccess: (token: string) =>
    api.post<{ user: { id: string; email: string; name: string; role: string } }>('/pilot/verify-access', { token }),

  getProfile: () => api.get<PilotProfile>('/pilot/me'),

  updateProfile: (data: { name?: string; alias?: string; phone?: string; engine?: string }) =>
    api.put<PilotProfile>('/pilot/me', data),

  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return uploadWithAuth<PilotProfile>('/pilot/me/photo', formData);
  },

  updateInscription: (id: string, data: { companions?: number; kartNumber?: number | null; engine?: string }) =>
    api.put<PilotInscription>(`/pilot/inscriptions/${id}`, data),
};
