import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authenticatedFetch } from '@hakika/auth';
import { Config } from '@hakika/config';

async function apiLogin(email: string, password: string) {
    const resp = await fetch(`${Config.API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) throw new Error('Invalid credentials');
    return resp.json();
}

async function apiMe() {
    const resp = await authenticatedFetch(`${Config.API_BASE}/auth/me`);
    if (!resp.ok) throw new Error('Failed to fetch user');
    return resp.json();
}

async function apiGetBusiness(id: string) {
    const resp = await authenticatedFetch(`${Config.API_BASE}/businesses/${id}`);
    if (!resp.ok) throw new Error('Failed to fetch business');
    return resp.json();
}

interface AuthState {
    user: { id: string; email: string; role: string } | null;
    businessId: string | null;
    businessName: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [businessName, setBusinessName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBusiness = async () => {
        try {
            const me = await apiMe();
            if (me.business_id) {
                setBusinessId(me.business_id);
                const biz = await apiGetBusiness(me.business_id);
                setBusinessName(biz.name || null);
            }
        } catch {}
    };

    const refreshBusiness = async () => {
        await fetchBusiness();
    };

    const login = useCallback(async (email: string, password: string) => {
        const data = await apiLogin(email, password);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        setUser({ id: payload.sub, email, role: payload.role });
        await fetchBusiness();
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setBusinessId(null);
        setBusinessName(null);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { setIsLoading(false); return; }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({ id: payload.sub, email: payload.email || '', role: payload.role });
            fetchBusiness().finally(() => setIsLoading(false));
        } catch { setIsLoading(false); }
    }, []);

    return (
        <AuthContext.Provider value={{ user, businessId, businessName, login, logout, isAuthenticated: !!user, isLoading, refreshBusiness }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
};
