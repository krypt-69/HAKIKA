import { Config } from '@hakika/config';
import { getTokenKey, getRefreshTokenKey, getExpectedRoleKey } from './storage';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export async function getValidToken(namespace: string): Promise<string | null> {
  const token = localStorage.getItem(getTokenKey(namespace));
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 > Date.now()) {
      return token;
    }
  } catch {
    // invalid token
  }

  const refreshToken = localStorage.getItem(getRefreshTokenKey(namespace));
  if (!refreshToken) return null;

  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const resp = await fetch(`${Config.API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!resp.ok) throw new Error('Refresh failed');
      const data = await resp.json();
      // Role boundary: do not accept a refreshed token whose role differs
      // from the expected role for this namespace.
      const expected = localStorage.getItem(getExpectedRoleKey(namespace));
      if (expected) {
        try {
          const payload = JSON.parse(atob(data.access_token.split('.')[1]));
          if (payload.role !== expected) {
            localStorage.removeItem(getTokenKey(namespace));
            localStorage.removeItem(getRefreshTokenKey(namespace));
            return null;
          }
        } catch {
          localStorage.removeItem(getTokenKey(namespace));
          localStorage.removeItem(getRefreshTokenKey(namespace));
          return null;
        }
      }
      localStorage.setItem(getTokenKey(namespace), data.access_token);
      localStorage.setItem(getRefreshTokenKey(namespace), data.refresh_token);
      return data.access_token;
    } catch {
      localStorage.removeItem(getTokenKey(namespace));
      localStorage.removeItem(getRefreshTokenKey(namespace));
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  namespace: string = 'hakika_common',
): Promise<Response> {
  const token = await getValidToken(namespace);
  if (!token) {
    localStorage.removeItem(getTokenKey(namespace));
    localStorage.removeItem(getRefreshTokenKey(namespace));
    throw new Error('No valid token available');
  }
  const headers = new Headers(init?.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  const newInit = { ...init, headers };
  return fetch(input, newInit);
}
