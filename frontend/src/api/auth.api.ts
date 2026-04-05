import { api } from './client';

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; role: 'ADMIN' | 'ORGANIZER' };
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  logout: () => api.post<void>('/auth/logout'),

  me: () => api.get<LoginResponse['user']>('/auth/me'),
};
