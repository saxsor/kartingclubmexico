import { useAuthStore } from '../store/auth.store';

const BASE_URL = '/api';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const SAFE_METHODS: RequestMethod[] = ['GET'];

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

async function request<T>(
  method: RequestMethod,
  path: string,
  body?: unknown,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!SAFE_METHODS.includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });

  // Handle 401 - try silent refresh
  if (response.status === 401 && path !== '/auth/refresh') {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshRes.ok) {
      // Cookies rotated by server; retry original request with fresh CSRF token
      // (the server sets a new csrf_token cookie on refresh)
      const retryHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (!SAFE_METHODS.includes(method)) {
        const csrf = getCsrfToken();
        if (csrf) retryHeaders['X-CSRF-Token'] = csrf;
      }

      const retryRes = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: retryHeaders,
        credentials: 'include',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(err.error ?? `HTTP ${retryRes.status}`);
      }
      if (retryRes.status === 204) return undefined as T;
      return retryRes.json();
    }

    useAuthStore.getState().logout();
    throw new Error('Sesión expirada');
  }

  // Handle 403 CSRF errors — the csrf_token cookie may have expired while the
  // refresh token is still valid. Attempt a silent refresh to get a new csrf cookie,
  // then retry once. If refresh fails, fall through to the normal error path.
  if (response.status === 403 && path !== '/auth/refresh') {
    const errBody = await response.json().catch(() => ({ error: '' }));
    if (errBody.error === 'CSRF token inválido') {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const retryHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (!SAFE_METHODS.includes(method)) {
          const csrf = getCsrfToken();
          if (csrf) retryHeaders['X-CSRF-Token'] = csrf;
        }
        const retryRes = await fetch(`${BASE_URL}${path}`, {
          method,
          headers: retryHeaders,
          credentials: 'include',
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!retryRes.ok) {
          const err = await retryRes.json().catch(() => ({ error: 'Error desconocido' }));
          throw new Error(err.error ?? `HTTP ${retryRes.status}`);
        }
        if (retryRes.status === 204) return undefined as T;
        return retryRes.json();
      }

      useAuthStore.getState().logout();
      throw new Error('Sesión expirada');
    }
    throw new Error(errBody.error ?? `HTTP ${response.status}`);
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
