import { useQuery } from '@tanstack/react-query';
import { authenticatedFetch } from '@hakika/auth';
import { Config } from '@hakika/config';

const fetchOrders = async () => {
  const resp = await authenticatedFetch(`${Config.API_BASE}/delivery/my-orders`, undefined, 'hakika_rider');
  if (!resp.ok) throw new Error('Failed to load deliveries');
  return resp.json();
};

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
}
