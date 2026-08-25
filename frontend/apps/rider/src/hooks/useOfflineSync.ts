import { useState, useEffect, useCallback } from 'react';
import { offlineQueue } from '../services/offlineQueue';
import { authenticatedFetch } from '@hakika/auth';
import { Config } from '@hakika/config';

export function useOfflineSync(onSyncComplete?: () => void) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'failed' | null>(null);

  const updatePendingCount = useCallback(async () => {
    const queue = await offlineQueue.getAll();
    setPendingCount(queue.length);
  }, []);

  const syncNow = useCallback(async () => {
    setLastSyncStatus(null);
    const success = await offlineQueue.replayAll(async (action) => {
      const url = `${Config.API_BASE}/delivery/orders/${action.orderId}/arrive?gps_lat=${action.payload.gps_lat}&gps_lon=${action.payload.gps_lon}`;
      const resp = await authenticatedFetch(url, { method: 'PUT' });
      if (!resp.ok) throw new Error('Arrive replay failed');
    });
    setLastSyncStatus(success ? 'success' : 'failed');
    await updatePendingCount();
    if (success && onSyncComplete) onSyncComplete();
  }, [updatePendingCount, onSyncComplete]);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updatePendingCount();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow, updatePendingCount]);

  return { isOnline, pendingCount, lastSyncStatus, syncNow, updatePendingCount };
}
