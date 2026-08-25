import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Config } from '@hakika/config';
import { getTokenKey, getRefreshTokenKey } from './storage';

async function apiLogin(email: string, password: string) {
    const resp = await fetch(`${Config.API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) throw new Error('Invalid credentials');
    return resp.json();
}

interface AuthState {
    user: { id: string; email: string; role: string } | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    getClient: () => any;
}

const AuthContext = createContext<AuthState | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
  namespace?: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, namespace = 'hakika_common' }) => {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const login = useCallback(async (email: string, password: string) => {
        const data = await apiLogin(email, password);
        localStorage.setItem(getTokenKey(namespace), data.access_token);
        localStorage.setItem(getRefreshTokenKey(namespace), data.refresh_token);
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        setUser({ id: payload.sub, email, role: payload.role });
    }, [namespace]);

    const logout = useCallback(() => {
        localStorage.removeItem(getTokenKey(namespace));
        localStorage.removeItem(getRefreshTokenKey(namespace));
        setUser(null);
    }, [namespace]);

    useEffect(() => {
        const token = localStorage.getItem(getTokenKey(namespace));
        if (!token) { setIsLoading(false); return; }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({ id: payload.sub, email: payload.email || '', role: payload.role });
        } catch {}
        setIsLoading(false);
    }, [namespace]);

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading, getClient: () => {} }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
};
