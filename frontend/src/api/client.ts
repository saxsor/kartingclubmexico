import { useAuthStore } from '../store/auth.store';

const BASE_URL = '/api';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(
  method: RequestMethod,
  path: string,
  body?: unknown,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });

  // Handle 401 - try refresh
  if (response.status === 401) {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const { token: newToken } = await refreshRes.json();
        useAuthStore.getState().setToken(newToken);
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(`${BASE_URL}${path}`, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!retryRes.ok) {
          const err = await retryRes.json().catch(() => ({ error: 'Error desconocido' }));
          throw new Error(err.error ?? `HTTP ${retryRes.status}`);
        }
        if (retryRes.status === 204) return undefined as T;
        return retryRes.json();
      }
    }
    useAuthStore.getState().logout();
    throw new Error('Sesión expirada');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
