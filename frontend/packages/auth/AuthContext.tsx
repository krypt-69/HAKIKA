import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createClient } from '@hakika/api-client/client';
import type { User } from '@hakika/types';

interface AuthState {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    const client = createClient({ token });

    const login = useCallback(async (email: string, password: string) => {
        const response = await client.auth.login(email, password);
        const accessToken = response.access_token;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', response.refresh_token);
        setToken(accessToken);
        // Decode token to get user info (simple JWT decode without verification)
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        setUser({ id: payload.sub, email: payload.email || email, role: payload.role });
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        // Check if token exists and is valid
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp * 1000 > Date.now()) {
                    setUser({ id: payload.sub, email: payload.email || '', role: payload.role });
                } else {
                    // Token expired, try refresh
                    const refreshToken = localStorage.getItem('refreshToken');
                    if (refreshToken) {
                        createClient().auth.refresh(refreshToken).then(res => {
                            localStorage.setItem('token', res.access_token);
                            localStorage.setItem('refreshToken', res.refresh_token);
                            setToken(res.access_token);
                            const newPayload = JSON.parse(atob(res.access_token.split('.')[1]));
                            setUser({ id: newPayload.sub, email: newPayload.email || '', role: newPayload.role });
                        }).catch(() => {
                            logout();
                        }).finally(() => setIsLoading(false));
                    } else {
                        logout();
                        setIsLoading(false);
                    }
                }
            } catch {
                logout();
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
};
