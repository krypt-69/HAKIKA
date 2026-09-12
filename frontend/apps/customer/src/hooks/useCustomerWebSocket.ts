import { useEffect, useRef, useState, useCallback } from 'react';

export interface RiderLocationPayload {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  timestamp?: string | null;
}

interface UseCustomerWebSocketReturn {
  isConnected: boolean;
}

export function useCustomerWebSocket(
  orderId: string | undefined,
  phone: string | null,
  onEvent: () => void,
  onReconnect?: () => void,
  onRiderLocation?: (payload: RiderLocationPayload) => void,
): UseCustomerWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);
  const onRiderLocationRef = useRef(onRiderLocation);

  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);
  useEffect(() => { onReconnectRef.current = onReconnect; }, [onReconnect]);
  useEffect(() => { onRiderLocationRef.current = onRiderLocation; }, [onRiderLocation]);

  const connect = useCallback(() => {
    if (!orderId || !phone) {
      console.log('Customer WS: skipped – missing orderId or phone', { orderId, phone });
      return;
    }
    console.log('Customer WS: connecting...', { orderId, phone });
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${location.host}/api/v1/ws/customer?order_id=${orderId}&phone=${encodeURIComponent(phone)}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      attemptRef.current = 0;
      onReconnectRef.current?.();
    };

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        if (event.type === 'order_status_changed') {
          onEventRef.current();
        } else if (event.type === 'rider_location') {
          onRiderLocationRef.current?.({
            latitude: event.latitude,
            longitude: event.longitude,
            heading: event.heading,
            speed: event.speed,
            timestamp: event.timestamp,
          });
        }
      } catch {}
    };

    ws.onclose = () => {
      setIsConnected(false);
      scheduleReconnect();
    };
    ws.onerror = () => ws.close();
    wsRef.current = ws;

    function scheduleReconnect() {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const delays = [0, 2000, 5000, 10000];
      const delay = delays[attemptRef.current] || 10000;
      reconnectTimerRef.current = setTimeout(() => {
        attemptRef.current++;
        connect();
      }, delay);
    }
  }, [orderId, phone]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { isConnected };
}
