import { Config } from '@hakika/config';

const API_URL = Config.API_BASE;

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function getValidToken(): Promise<string | null> {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 > Date.now()) return token;
  } catch {}

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const resp = await fetch(`${API_URL}/auth/refresh`, {
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

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await getValidToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response = await fetch(`${API_URL}${url}`, { ...options, headers });
  if (response.status === 401 && token) {
    const newToken = await getValidToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${url}`, { ...options, headers });
    }
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error?.detail || error?.message || response.statusText);
  }
  if (response.status === 204) return undefined as unknown as T;
  const text = await response.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text);
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; refresh_token: string }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, role: string) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, role }) }),
    me: () => request<{ id: string; email: string; role: string; business_id?: string }>('/auth/me'),
  },
  businesses: {
    list: () => request<any[]>('/businesses'),
    get: (id: string) => request<any>(`/businesses/${id}`),
    create: (data: any) => request<any>('/businesses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/businesses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  products: {
    listByBusiness: (businessId: string) => request<any[]>(`/businesses/${businessId}/products`),
    create: (businessId: string, data: any) =>
      request<any>(`/businesses/${businessId}/products`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/products/${id}`, { method: 'DELETE' }),
  },
  orders: {
    listBusiness: () => request<any[]>('/orders/business/my'),
    accept: (id: string) => request(`/orders/${id}/accept`, { method: 'PUT' }),
  },
  riders: {
    listByBusiness: (businessId: string) => request<any[]>(`/riders/${businessId}`),
  },
  settlements: {
    list: () => request<any[]>('/settlements'),
  },
};
