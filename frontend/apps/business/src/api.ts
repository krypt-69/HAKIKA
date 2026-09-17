import { Config } from '@hakika/config';

const API_URL = Config.API_BASE;

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

interface CreditTransaction {
  id: string;
  business_id: string;
  amount: number;
  balance: number;
  type: 'purchase' | 'usage' | 'refund';
  status: string;
  created_at: string;
}

interface CreditPlan {
  id: string;
  name: string;
  price: number;
  credit_amount: number;  // matches backend field
  description: string | null;
}

export interface BusinessDetail {
  id: string;
  slug: string;
  name: string;
  category_id: number;
  description: string | null;
  trust_score: number;
  credit_balance: number | null;
  remaining_credit_volume: number | null;
  payment_model: string | null;
  collect_payment_before_delivery: boolean | null;
  next_credit_expiry: string | null;
  logo_url: string | null;
  locations: Array<{
    id: string;
    lat: number;
    lon: number;
    address_text: string | null;
    is_primary: boolean;
  }>;
  operating_hours: Array<{
    id: string;
    day_of_week: number;
    opens_at: string | null;
    closes_at: string | null;
    is_closed: boolean;
  }>;
  payment_methods: Array<{
    id: string;
    type: 'till' | 'paybill';
    account_number?: string | null;
    paybill_short_code?: string | null;
    last_four_digits: string | null;
    is_active: boolean;
  }>;
}

async function getValidToken(): Promise<string | null> {
  const token = localStorage.getItem('hakika_business_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 > Date.now()) return token;
  } catch {}

  const refreshToken = localStorage.getItem('hakika_business_refresh_token');
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
      try {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        if (payload.role !== 'owner') {
          localStorage.removeItem('hakika_business_token');
          localStorage.removeItem('hakika_business_refresh_token');
          return null;
        }
      } catch {
        localStorage.removeItem('hakika_business_token');
        localStorage.removeItem('hakika_business_refresh_token');
        return null;
      }
      localStorage.setItem('hakika_business_token', data.access_token);
      localStorage.setItem('hakika_business_refresh_token', data.refresh_token);
      return data.access_token;
    } catch {
      localStorage.removeItem('hakika_business_token');
      localStorage.removeItem('hakika_business_refresh_token');
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
    const body = await response.json().catch(() => ({}));
    // Backend errors use { success: false, error: { code, message } }
    const backendMessage = body?.error?.message || body?.detail || body?.message;
    throw new Error(backendMessage || response.statusText);
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
    get: (id: string) => request<BusinessDetail>(`/businesses/${id}`),
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
  categories: () => request<any[]>('/categories'),
  productCategories: () => request<any[]>('/product-categories'),
  homeSnippet: {
    get: (businessId: string) => request<any>(`/businesses/${businessId}/home-snippet`),
    update: (businessId: string, data: any) =>
      request<any>(`/businesses/${businessId}/home-snippet`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  orders: {
    listBusiness: () => request<any[]>('/orders/business/my'),
    accept: (id: string) => request(`/orders/${id}/accept`, { method: 'PUT' }),
  },
  riders: {
    listByBusiness: (businessId: string) => request<any[]>(`/businesses/${businessId}/riders`),

    search: (businessId: string, query: string) =>
      request<any[]>(`/businesses/${businessId}/riders/search?q=${encodeURIComponent(query)}`),
    getProfile: (riderId: string) =>
      request<any>(`/riders/${riderId}/profile`),
    add: (businessId: string, riderId: string) =>
      request<any>(`/businesses/${businessId}/riders/${riderId}`, { method: 'POST' }),
    invite: (businessId: string, riderId: string) =>
      request<any>(`/businesses/${businessId}/riders/${riderId}/invite`, { method: 'POST' }),
    remove: (businessId: string, riderId: string) =>
      request<any>(`/businesses/${businessId}/riders/${riderId}`, { method: 'DELETE' }),
  },
  settlements: {
    list: () => request<any[]>('/settlements'),
  },
  updatePhone: (phone: string) =>
    request<any>('/auth/me/phone', { method: 'PUT', body: JSON.stringify({ phone }) }),
  credit: {
    getHistory: (businessId: string) =>
      request<CreditTransaction[]>(`/credit/businesses/${businessId}/history`),
    getPlans: () =>
      request<CreditPlan[]>('/credit/plans'),
    // purchase is not exposed in OpenAPI – kept for reference but not used in UI
    purchase: (businessId: string, creditPlanId: string) =>
      request<{ checkout_url: string }>(
        `/credit/businesses/${businessId}/purchase?credit_plan_id=${creditPlanId}`,
        { method: 'POST' }
      ),
  },
  request, // exported for fetching single orders in OrderDetails
};