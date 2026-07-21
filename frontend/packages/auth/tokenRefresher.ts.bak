import { Config } from '@hakika/config';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export async function getValidToken(): Promise<string | null> {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 > Date.now()) {
      return token;
    }
  } catch {
    // invalid token
  }

  const refreshToken = localStorage.getItem('refreshToken');
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
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      return data.access_token;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = await getValidToken();
  if (!token) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    throw new Error('No valid token available');
  }
  const headers = new Headers(init?.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  const newInit = { ...init, headers };
  return fetch(input, newInit);
}
