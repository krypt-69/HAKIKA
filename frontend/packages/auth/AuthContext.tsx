import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createClient } from '@hakika/api-client/client';
import type { User } from '@hakika/types';

interface AuthState {
    user: User | null;
    token: string | null;
    businessId: string | null;
    businessName: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    getClient: () => ReturnType<typeof createClient>;
    fetchBusinessId: (accessToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return (payload.exp * 1000) < Date.now();
    } catch {
        return true;
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [businessName, setBusinessName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const getClient = useCallback(() => createClient({ token }), [token]);

    const fetchBusinessId = useCallback(async (accessToken: string) => {
        try {
            const resp = await fetch('http://localhost:8000/api/v1/auth/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data.business_id) {
                    setBusinessId(data.business_id);
                    const bizResp = await fetch(`http://localhost:8000/api/v1/businesses/${data.business_id}`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (bizResp.ok) {
                        const bizData = await bizResp.json();
                        setBusinessName(bizData.name);
                    }
                }
            }
        } catch {}
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const response = await getClient().auth.login(email, password);
        const accessToken = response.access_token;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', response.refresh_token);
        setToken(accessToken);
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        setUser({ id: payload.sub, email: email, role: payload.role });
        await fetchBusinessId(accessToken);
    }, [getClient, fetchBusinessId]);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setToken(null);
        setUser(null);
        setBusinessId(null);
        setBusinessName(null);
    }, []);

    // On mount or token change, validate and refresh if needed
    useEffect(() => {
        const initAuth = async () => {
            if (!token) {
                setIsLoading(false);
                return;
            }

            // If token is expired, try refresh
            if (isTokenExpired(token)) {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    try {
                        const res = await createClient().auth.refresh(refreshToken);
                        localStorage.setItem('token', res.access_token);
                        localStorage.setItem('refreshToken', res.refresh_token);
                        setToken(res.access_token);
                        const payload = JSON.parse(atob(res.access_token.split('.')[1]));
                        setUser({ id: payload.sub, email: payload.email || '', role: payload.role });
                        await fetchBusinessId(res.access_token);
                        setIsLoading(false);
                        return;
                    } catch {
                        logout();
                        setIsLoading(false);
                        return;
                    }
                } else {
                    logout();
                    setIsLoading(false);
                    return;
                }
            }

            // Token is valid
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({ id: payload.sub, email: payload.email || '', role: payload.role });
                await fetchBusinessId(token);
            } catch {
                logout();
            }
            setIsLoading(false);
        };

        initAuth();
    }, []); // only run on mount

    return (
        <AuthContext.Provider value={{
            user, token, businessId, businessName, login, logout,
            isAuthenticated: !!token, isLoading, getClient, fetchBusinessId
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
};
