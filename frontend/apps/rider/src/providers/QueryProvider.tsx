import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { get, set } from 'idb-keyval';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  },
});

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    get('hakika-rider-query-cache').then((data) => {
      if (data) { queryClient.setQueryData(['orders'], data); }
      setRestored(true);
    });
  }, []);

  useEffect(() => {
    const unsub = queryClient.getQueryCache().subscribe(() => {
      const orders = queryClient.getQueryData(['orders']);
      if (orders) set('hakika-rider-query-cache', orders);
    });
    return () => unsub();
  }, []);

  if (!restored) return null;

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
