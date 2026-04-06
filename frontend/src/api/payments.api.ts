import { api } from './client';
import { Payment } from './inscriptions.api';
import { buildPaginationQuery, PaginationMeta, PaginationParams } from './pagination';

export interface CashBoxData {
  payments: (Payment & { inscription: { pilot: { name: string; alias: string | null } } })[];
  totals: { total: number; serviceFee: number; foodFee: number; other: number };
  pagination: PaginationMeta;
}

export const paymentsApi = {
  getCashBox: (slug: string, params?: PaginationParams) =>
    api.get<CashBoxData>(`/events/${slug}/cashbox${buildPaginationQuery(params ?? {})}`),
  addPayment: (slug: string, inscriptionId: string, data: { type: string; amount: number; notes?: string }) =>
    api.post<Payment>(`/events/${slug}/inscriptions/${inscriptionId}/payments`, data),
  deletePayment: (slug: string, paymentId: string) =>
    api.delete<void>(`/events/${slug}/payments/${paymentId}`),
};
