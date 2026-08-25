import { useEffect, useRef } from 'react';
import { getTokenKey } from '@hakika/auth';
import { useQueryClient } from '@tanstack/react-query';
import { connectRiderWebSocket, disconnectRiderWebSocket } from '../websocket';

export function useWebSocket(onPaymentConfirmed?: (event: any) => void) {
  const queryClient = useQueryClient();
  const onPaymentRef = useRef(onPaymentConfirmed);

  useEffect(() => {
    onPaymentRef.current = onPaymentConfirmed;
  }, [onPaymentConfirmed]);

  useEffect(() => {
    const token = localStorage.getItem(getTokenKey('hakika_rider'));
    if (token) {
      connectRiderWebSocket(token, (event) => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });

        if (event.type === 'order_payment_confirmed') {
          onPaymentRef.current?.(event);
        }
      });
    }
    return () => disconnectRiderWebSocket();
  }, [queryClient]);
}
