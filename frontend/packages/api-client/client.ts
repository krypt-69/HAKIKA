const BASE_URL = 'http://localhost:8000/api/v1';

type ClientOptions = {
    token?: string | null;
};

export function createClient(opts: ClientOptions = {}) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (opts.token) {
        headers['Authorization'] = `Bearer ${opts.token}`;
    }

    async function request<T>(url: string, options?: RequestInit): Promise<T> {
        const response = await fetch(`${BASE_URL}${url}`, {
            ...options,
            headers: { ...headers, ...(options?.headers || {}) },
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
            get: (id: string) => request(`/orders/${id}`),
            accept: (id: string) => request(`/orders/${id}/accept`, { method: 'PUT' }),
            cancel: (id: string) => request(`/orders/${id}/business-cancel`, { method: 'PUT' }),
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
    };
}
