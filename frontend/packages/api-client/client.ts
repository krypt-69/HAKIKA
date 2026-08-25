import { getValidToken } from '@hakika/auth/tokenRefresher';

const BASE_URL = 'http://localhost:8000/api/v1';

type ClientOptions = {
    token?: string | null;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const token = await getValidToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> || {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${BASE_URL}${url}`, { ...options, headers });

    if (response.status === 401 && token) {
        const newToken = await getValidToken();
        if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(`${BASE_URL}${url}`, { ...options, headers });
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

export function createClient(opts: ClientOptions = {}) {
    return {
        auth: {
            login: (email: string, password: string) =>
                request<{ access_token: string; refresh_token: string }>('/auth/login', {
                    method: 'POST', body: JSON.stringify({ email, password }),
                }),
            register: (email: string, password: string, role: string) =>
                request('/auth/register', {
                    method: 'POST', body: JSON.stringify({ email, password, role }),
                }),
            refresh: (refreshToken: string) =>
                request<{ access_token: string; refresh_token: string }>('/auth/refresh', {
                    method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }),
                }),
        },
        businesses: {
            list: () => request('/businesses'),
            get: (id: string) => request(`/businesses/${id}`),
            profile: (slug: string) => request(`/business/${slug}`),
            create: (data: any) => request('/businesses', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: any) => request(`/businesses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => request(`/businesses/${id}`, { method: 'DELETE' }),
        },
        products: {
            listByBusiness: (businessId: string) => request(`/businesses/${businessId}/products`),
            get: (id: string) => request(`/products/${id}`),
            create: (businessId: string, data: any) =>
                request(`/businesses/${businessId}/products`, { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: any) =>
                request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => request(`/products/${id}`, { method: 'DELETE' }),
        },
        orders: {
            listBusiness: () => request('/orders/business/my'),
            listCustomer: (phone: string) => request(`/orders/customer/my?phone=${encodeURIComponent(phone)}`),
            get: (id: string) => request(`/orders/${id}`),
            create: (data: any) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
            accept: (id: string) => request(`/orders/${id}/accept`, { method: 'PUT' }),
            cancel: (id: string) => request(`/orders/${id}/business-cancel`, { method: 'PUT' }),
            confirm: (id: string, phone: string) =>
                request(`/orders/${id}/confirm`, { method: 'POST', body: JSON.stringify({ phone }) }),
            reportProblem: (id: string, phone: string, reason: string) =>
                request(`/orders/${id}/report-problem`, { method: 'POST', body: JSON.stringify({ phone, reason }) }),
        },
        delivery: {
            assignRider: (orderId: string, riderId: string) =>
                request(`/delivery/orders/${orderId}/assign?rider_id=${riderId}`, { method: 'PUT' }),
        },
        riders: {
            listByBusiness: (businessId: string) => request(`/riders/${businessId}`),
            create: (businessId: string, data: any) =>
                request(`/riders/${businessId}`, { method: 'POST', body: JSON.stringify(data) }),
        },
        discovery: {
            categories: () => request('/categories'),
            nearbyBusinesses: (lat: number, lon: number, radius?: number, categoryId?: number) => {
                const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
                if (radius) params.set('radius', String(radius));
                if (categoryId) params.set('category_id', String(categoryId));
                return request(`/businesses/discover?${params.toString()}`);
            },
        },
        settlements: {
            list: () => request('/settlements'),
        },
    };
}
