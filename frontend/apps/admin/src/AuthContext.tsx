import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

interface AuthState {
  user: { email: string; role: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'admin') {
          // Wrong-role token from a prior build/session — purge.
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setUser(null);
          setIsLoading(false);
          return;
        }
        setUser({ email: payload.sub || '', role: payload.role });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    let payload: any;
    try {
      payload = JSON.parse(atob(data.access_token.split('.')[1]));
    } catch {
      throw new Error('Invalid credentials');
    }
    if (payload.role !== 'admin') {
      // Wrong application for this account — do not persist tokens.
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      throw new Error('Invalid credentials');
    }
    localStorage.setItem('token', data.access_token);
    if (data.refresh_token) localStorage.setItem('refreshToken', data.refresh_token);
    setUser({ email: payload.sub || email, role: payload.role });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
