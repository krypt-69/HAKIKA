import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const API_BASE = 'http://localhost:8000/api/v1';

async function apiLogin(email: string, password: string) {
    const resp = await fetch(`${API_BASE}/auth/login`, {
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const login = useCallback(async (email: string, password: string) => {
        const data = await apiLogin(email, password);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        setUser({ id: payload.sub, email, role: payload.role });
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { setIsLoading(false); return; }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({ id: payload.sub, email: payload.email || '', role: payload.role });
        } catch {}
        setIsLoading(false);
    }, []);

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
