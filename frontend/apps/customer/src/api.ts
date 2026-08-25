import { Config } from '@hakika/config';

const API_URL = Config.API_BASE;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    });
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
    categories: () => request<any[]>('/categories'),
    discover: (params: {
        lat?: number; lon?: number; radius?: number;
        categoryId?: number; search?: string; cursor?: string;
    }) => {
        const qs = new URLSearchParams();
        if (params.lat !== undefined && params.lon !== undefined) {
            qs.set('lat', String(params.lat));
            qs.set('lon', String(params.lon));
            if (params.radius) qs.set('radius', String(params.radius));
        }
        if (params.categoryId) qs.set('category_id', String(params.categoryId));
        if (params.search && params.search.trim()) qs.set('search', params.search.trim());
        if (params.cursor) qs.set('cursor', params.cursor);
        const q = qs.toString();
        return request<{ businesses: any[]; next_cursor: string | null }>(
            q ? `/businesses/discover?${q}` : '/businesses/discover'
        );
    },
    businessBySlug: (slug: string) => request<any>(`/b/${slug}`),
    businessById: (id: string) => request<any>(`/b/${id}`),
    createOrder: (data: any) => request<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),
    getOrder: (id: string) => request<any>(`/orders/${id}`),
    confirmDelivery: (id: string, phone: string) =>
        request<any>(`/orders/${id}/confirm`, { method: 'POST', body: JSON.stringify({ phone }) }),
    reportProblem: (id: string, phone: string, reason: string) =>
        request<any>(`/orders/${id}/report-problem`, { method: 'POST', body: JSON.stringify({ phone, reason }) }),
    initiatePayment: (orderId: string) =>
        fetch(`${API_URL}/payments/${orderId}/initiate`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
            .then(r => { if (!r.ok) throw new Error('Payment initiation failed'); return r.json(); }),
    getPaymentStatus: (orderId: string) =>
        request<any>(`/payments/orders/${orderId}`),
    payOrder: (id: string, phone: string) =>
        request<any>(`/orders/${id}/pay?phone=${encodeURIComponent(phone)}`, { method: 'POST' }),
    mockCallback: (checkoutId: string) =>
        request<any>(`/payments/mock/callback/${checkoutId}`, { method: 'POST' }),
    getMyOrders: (phone: string) =>
        request<any>(`/orders/customer/my?phone=${encodeURIComponent(phone)}`),
    getReceipt: (orderId: string) =>
        request<any>(`/orders/${orderId}/receipt`),
};
