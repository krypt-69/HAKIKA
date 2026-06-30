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
        return response.json();
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
    };
}
