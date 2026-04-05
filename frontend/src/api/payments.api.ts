import { api } from './client';
import { Payment } from './inscriptions.api';

export interface CashBoxData {
  payments: (Payment & { inscription: { pilot: { name: string; alias: string | null } } })[];
  totals: { total: number; serviceFee: number; foodFee: number; other: number };
}

export const paymentsApi = {
  getCashBox: (slug: string) => api.get<CashBoxData>(`/events/${slug}/cashbox`),
  addPayment: (slug: string, inscriptionId: string, data: { type: string; amount: number; notes?: string }) =>
    api.post<Payment>(`/events/${slug}/inscriptions/${inscriptionId}/payments`, data),
  deletePayment: (slug: string, paymentId: string) =>
    api.delete<void>(`/events/${slug}/payments/${paymentId}`),
};
