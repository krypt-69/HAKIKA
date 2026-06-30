import React, { createContext, useContext, useState, useCallback } from 'react';

interface CustomerSession {
  customer_id: string;
  session_token: string;
  phone: string;
}

interface CustomerAuthState {
  session: CustomerSession | null;
  loginWithPhone: (phone: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthState | null>(null);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<CustomerSession | null>(() => {
    const stored = localStorage.getItem('customerSession');
    return stored ? JSON.parse(stored) : null;
  });

  const loginWithPhone = useCallback(async (phone: string) => {
    const response = await fetch('http://localhost:8000/api/v1/auth/customer/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (!response.ok) throw new Error('Failed to create session');
    const data = await response.json();
    const newSession: CustomerSession = {
      customer_id: data.customer_id,
      session_token: data.session_token,
      phone,
    };
    localStorage.setItem('customerSession', JSON.stringify(newSession));
    setSession(newSession);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('customerSession');
    setSession(null);
  }, []);

  return (
    <CustomerAuthContext.Provider
      value={{ session, loginWithPhone, logout, isAuthenticated: !!session }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be inside CustomerAuthProvider');
  return ctx;
};
