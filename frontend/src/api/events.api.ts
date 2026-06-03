import { api, uploadWithAuth } from './client';
import { buildPaginationQuery, PaginatedResponse, PaginationParams } from './pagination';


export type EventStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'FINISHED';
export type Category = 'SHIFTER' | 'DOS_TIEMPOS' | 'FORMULA_MUNDIAL' | 'NUEVE_HP' | 'ROOKIES' | 'MINIS';

export interface EventCategory {
  id: string;
  eventId: string;
  category: Category;
  active: boolean;
}

export interface KartEvent {
  id: string;
  name: string;
  slug: string;
  date: string;
  description: string | null;
  status: EventStatus;
  year: number;
  serviceFee: string;
  foodFee: string;
  staffCount: number;
  blockCheckInOnDebt: boolean;
  transferInfo: string | null;
  posterUrl: string | null;
  diplomaTemplateUrl: string | null;
  diplomaNameX: number;
  diplomaNameY: number;
  diplomaNameWidth: number;
  diplomaNameHeight: number;
  diplomaFontSize: number;
  diplomaTextColor: string;
  diplomaTextAlign: string;
  track: string | null;
  address: string | null;
  schedule: string | null;
  conditions: string | null;
  championshipId: string | null;
  championship: { id: string; name: string } | null;
  eventCategories: EventCategory[];
  inscriptions?: { category: string; status: string }[];
  createdAt: string;
  updatedAt: string;
}

export const eventsApi = {
  list: (params?: PaginationParams & { public?: boolean }) =>
    api.get<PaginatedResponse<KartEvent>>(`/events${buildPaginationQuery(params ?? {})}`),
  get: (slug: string) => api.get<KartEvent>(`/events/${slug}`),
  create: (data: unknown) => api.post<KartEvent>('/events', data),
  update: (slug: string, data: unknown) => api.put<KartEvent>(`/events/${slug}`, data),
  delete: (slug: string) => api.delete<void>(`/events/${slug}`),
  uploadPoster: (slug: string, file: File) => {
    const fd = new FormData();
    fd.append('poster', file);
    return uploadWithAuth<KartEvent>(`/events/${slug}/poster`, fd);
  },
  deletePoster: (slug: string) => api.delete<KartEvent>(`/events/${slug}/poster`),
  uploadDiplomaTemplate: (slug: string, file: File) => {
    const fd = new FormData();
    fd.append('template', file);
    return uploadWithAuth<KartEvent>(`/events/${slug}/diploma-template`, fd);
  },
  deleteDiplomaTemplate: (slug: string) => api.delete<KartEvent>(`/events/${slug}/diploma-template`),
  patchStatus: (slug: string, status: EventStatus) =>
    api.patch<KartEvent>(`/events/${slug}/status`, { status }),
  getCategories: (slug: string) => api.get<EventCategory[]>(`/events/${slug}/categories`),
  updateCategories: (slug: string, categories: Category[]) =>
    api.put<EventCategory[]>(`/events/${slug}/categories`, { categories }),
};
