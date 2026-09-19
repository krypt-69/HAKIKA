import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { useAuth } from './AuthContext';

interface PendingOrdersState {
  /** Number of orders in `waiting_acceptance` for this business. */
  pendingCount: number;
  /** Re-fetch the count immediately (e.g. after accepting an order). */
  refresh: () => Promise<void>;
}

const PendingOrdersContext = createContext<PendingOrdersState | null>(null);

export const PendingOrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { businessId, isAuthenticated } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!businessId || !isAuthenticated) {
      setPendingCount(0);
      return;
    }
    try {
      const orders = await api.orders.listBusiness();
      const n = (orders || []).filter((o: any) => o.status === 'waiting_acceptance').length;
      setPendingCount(n);
    } catch {
      // Silent — the badge must never break navigation.
    }
  }, [businessId, isAuthenticated]);

  // Initial fetch whenever the authenticated business changes.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Light polling so new orders appear even while the merchant is on another page.
  // Skips while the tab is hidden to avoid pointless traffic.
  useEffect(() => {
    if (!businessId || !isAuthenticated) return;
    const tick = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [refresh, businessId, isAuthenticated]);

  return (
    <PendingOrdersContext.Provider value={{ pendingCount, refresh }}>
      {children}
    </PendingOrdersContext.Provider>
  );
};

export const usePendingOrders = () => {
  const ctx = useContext(PendingOrdersContext);
  if (!ctx) throw new Error('usePendingOrders must be inside PendingOrdersProvider');
  return ctx;
};
