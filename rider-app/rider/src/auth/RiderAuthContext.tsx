import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://10.0.2.2:8000/api/v1'; // Android emulator localhost

interface RiderUser {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: RiderUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export const RiderAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<RiderUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync('riderToken').then(stored => {
      if (stored) {
        setToken(stored);
        // decode payload
        try {
          const payload = JSON.parse(atob(stored.split('.')[1]));
          setUser({ id: payload.sub, email: '', role: payload.role });
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const resp = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) throw new Error('Invalid credentials');
    const data = await resp.json();
    const accessToken = data.access_token;
    await SecureStore.setItemAsync('riderToken', accessToken);
    setToken(accessToken);
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    setUser({ id: payload.sub, email, role: payload.role });
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('riderToken');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useRiderAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useRiderAuth must be inside RiderAuthProvider');
  return ctx;
};
