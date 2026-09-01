import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { api } from './api';

interface OrdersState {
  orders: any[];
  phone: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  activeStage: string;
  searchQuery: string;
  scrollPositions: {
    notifications: number;
    myOrders: number;
  };
}

interface OrdersActions {
  fetchOrders: (phone: string, force?: boolean) => Promise<void>;
  setOrders: (orders: any[]) => void;
  setPhone: (phone: string | null) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setError: (error: string) => void;
  setActiveStage: (stage: string) => void;
  setSearchQuery: (query: string) => void;
  saveScrollPosition: (list: 'notifications' | 'myOrders', y: number) => void;
  clearOrders: () => void;
}

const OrdersContext = createContext<(OrdersState & OrdersActions) | null>(null);

export const useOrdersContext = () => {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrdersContext must be used within OrdersProvider');
  return ctx;
};

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrdersState] = useState<any[]>([]);
  const [phone, setPhoneState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeStage, setActiveStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollPositions, setScrollPositions] = useState({
    notifications: 0,
    myOrders: 0,
  });

  const ordersRef = useRef<any[]>([]);
  const phoneRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const setOrders = useCallback((newOrders: any[]) => {
    ordersRef.current = newOrders;
    setOrdersState(newOrders);
  }, []);

  const setPhone = useCallback((newPhone: string | null) => {
    phoneRef.current = newPhone;
    setPhoneState(newPhone);
  }, []);

  const clearOrders = useCallback(() => {
    ordersRef.current = [];
    phoneRef.current = null;
    requestIdRef.current++;
    setOrdersState([]);
    setPhoneState(null);
    setError('');
    setLoading(false);
    setRefreshing(false);
  }, []);

  const fetchOrders = useCallback(async (phoneNumber: string, force = false) => {
    if (!phoneNumber.trim()) {
      clearOrders();
      return;
    }

    // Use refs for cache and current state, not closure state
    if (!force && phoneRef.current === phoneNumber && ordersRef.current.length > 0) {
      return;
    }

    phoneRef.current = phoneNumber;
    setPhoneState(phoneNumber);
    setError('');
    setLoading(true);
    setRefreshing(false);

    const currentRequestId = ++requestIdRef.current;

    try {
      const data = await api.getMyOrders(phoneNumber);
      if (currentRequestId !== requestIdRef.current) return;
      ordersRef.current = data || [];
      setOrdersState(data || []);
    } catch (err: any) {
      if (currentRequestId !== requestIdRef.current) return;
      setError(err.message || 'Failed to load orders');
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [clearOrders]);

  const saveScrollPosition = useCallback((list: 'notifications' | 'myOrders', y: number) => {
    setScrollPositions(prev => ({ ...prev, [list]: y }));
  }, []);

  const value: OrdersState & OrdersActions = {
    orders,
    phone,
    loading,
    refreshing,
    error,
    activeStage,
    searchQuery,
    scrollPositions,
    fetchOrders,
    setOrders,
    setPhone,
    setLoading,
    setRefreshing,
    setError,
    setActiveStage,
    setSearchQuery,
    saveScrollPosition,
    clearOrders,
  };

  return React.createElement(OrdersContext.Provider, { value }, children);
};
