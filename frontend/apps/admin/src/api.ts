import { Config } from '@hakika/config';

const API_URL = Config.API_BASE;

async function getToken(): Promise<string | null> {
  return localStorage.getItem('token');
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const isFormData = options?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${url}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
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
  },
  admin: {
    stats: () => request<any>('/admin/stats'),
    businesses: (skip = 0, limit = 50) =>
      request<any[]>(`/admin/businesses?skip=${skip}&limit=${limit}`),
    business: (id: string) => request<any>(`/admin/businesses/${id}`),
    businessOrders: (id: string) => request<any[]>(`/admin/businesses/${id}/orders`),
    businessCreditOrders: (id: string) => request<any[]>(`/admin/businesses/${id}/credit-orders`),
    order: (id: string) => request<any>(`/admin/orders/${id}`),
    suspendBusiness: (id: string) =>
      request(`/admin/businesses/${id}/suspend`, { method: 'PUT' }),
    activateBusiness: (id: string) =>
      request(`/admin/businesses/${id}/activate`, { method: 'PUT' }),
    // Commercial Controls
    paymentPolicies: () => request<any[]>('/admin/payment-policies'),
    updatePaymentPolicy: (key: string, value: string) =>
      request(`/admin/payment-policies/${key}?value=${encodeURIComponent(value)}`, { method: 'PUT' }),
    creditPlans: () => request<any[]>('/admin/credit-plans'),
    createCreditPlan: (name: string, price: number, credit_amount: number, credit_volume: number, description: string | null = null) => {
      let url = `/admin/credit-plans?name=${encodeURIComponent(name)}&price=${price}&credit_amount=${credit_amount}&credit_volume=${credit_volume}`;
      if (description) url += `&description=${encodeURIComponent(description)}`;
      return request(url, { method: 'POST' });
    },
    updateCreditPlan: (id: string, data: Record<string, any>) => {
      const params = new URLSearchParams();
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
      return request(`/admin/credit-plans/${id}?${params.toString()}`, { method: 'PUT' });
    },
    deleteCreditPlan: (id: string) =>
      request(`/admin/credit-plans/${id}`, { method: 'DELETE' }),
    settlements: () => request<any[]>('/admin/settlements'),
    processSettlement: (id: string) =>
      request(`/admin/settlements/${id}/process`, { method: 'POST' }),
    categories: () => request<any[]>('/admin/categories'),
    createCategory: (name: string, imageFile?: File) => {
      const formData = new FormData();
      if (imageFile) formData.append('image', imageFile);
      return request(`/admin/categories?name=${encodeURIComponent(name)}`, { method: 'POST', body: formData, headers: {} });
    },
    updateCategory: (id: number, name: string, imageFile?: File) => {
      const formData = new FormData();
      if (imageFile) formData.append('image', imageFile);
      return request(`/admin/categories/${id}?name=${encodeURIComponent(name)}`, { method: 'PUT', body: formData, headers: {} });
    },
    deleteCategory: (id: number) =>
      request(`/admin/categories/${id}`, { method: 'DELETE' }),
    disputes: () => request<any[]>('/admin/disputes'),
    resolveDispute: (id: string, resolution: string) =>
      request(`/admin/disputes/${id}/resolve?resolution=${resolution}`, { method: 'PUT' }),
    creditOrders: (skip: number = 0, limit: number = 50) =>
      request<any[]>(`/admin/credit-orders?skip=${skip}&limit=${limit}`),
  },
};
