import { api } from './client';
import { Inscription, CheckIn } from './inscriptions.api';

export const checkinApi = {
  list: (slug: string) => api.get<Inscription[]>(`/events/${slug}/checkin`),
  checkIn: (slug: string, inscriptionId: string, kartNumber: number, kartNotes?: string) =>
    api.post<CheckIn>(`/events/${slug}/inscriptions/${inscriptionId}/checkin`, { kartNumber, kartNotes }),
  undoCheckIn: (slug: string, inscriptionId: string) =>
    api.delete<void>(`/events/${slug}/inscriptions/${inscriptionId}/checkin`),
};
