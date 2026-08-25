import React, { createContext, useContext, useCallback, useState } from 'react';
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
}

const OrdersContext = createContext<(OrdersState & OrdersActions) | null>(null);

export const useOrdersContext = () => {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrdersContext must be used within OrdersProvider');
  return ctx;
};

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeStage, setActiveStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollPositions, setScrollPositions] = useState({
    notifications: 0,
    myOrders: 0,
  });

  const fetchOrders = useCallback(async (phoneNumber: string, force = false) => {
    if (!phoneNumber) return;

    const hasCached = orders.length > 0 && phone === phoneNumber;
    if (!force && hasCached) return;

    setPhone(phoneNumber);
    setError('');

    if (orders.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await api.getMyOrders(phoneNumber);
      setOrders(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orders, phone]);

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
  };

  return React.createElement(OrdersContext.Provider, { value }, children);
};
