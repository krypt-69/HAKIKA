import { useEffect, useRef, useState, useCallback } from 'react';

interface UseCustomerWebSocketReturn {
  isConnected: boolean;
}

export function useCustomerWebSocket(
  orderId: string | undefined,
  phone: string | null,
  onEvent: () => void
): UseCustomerWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!orderId || !phone) { console.log('Customer WS: skipped – missing orderId or phone', {orderId, phone}); return; }
    console.log('Customer WS: connecting...', {orderId, phone});
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${location.host}/api/v1/ws/customer?order_id=${orderId}&phone=${encodeURIComponent(phone)}`;
    const ws = new WebSocket(url);
    ws.onopen = () => {
      setIsConnected(true);
      attemptRef.current = 0;
    };
    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        if (event.type === 'order_status_changed') {
          onEventRef.current();
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
