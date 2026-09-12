import { getValidToken } from '@hakika/auth';

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let attempt = 0;
const MAX_DELAY = 10_000;


// Outbound message queue — safe to call before the socket is OPEN.
let pendingOutbound: string[] = [];

function flushPending() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  while (pendingOutbound.length > 0) {
    const payload = pendingOutbound.shift();
    if (payload) {
      try { ws.send(payload); } catch { /* will be retried on next open */ }
    }
  }
}

export function sendTrackingMessage(type: string, payload: Record<string, any>) {
  const message = JSON.stringify({ type, ...payload });
  const ready = ws && ws.readyState === WebSocket.OPEN;
  console.log('sendTrackingMessage', { type, ready, order_id: payload.order_id });

  // Always queue first; the queue flushes on ws.onopen.
  pendingOutbound.push(message);

  if (ws && ws.readyState === WebSocket.OPEN) {
    // Already open: flush immediately through the same queue.
    flushPending();
    return;
  }

  if (ws && ws.readyState === WebSocket.CONNECTING) {
    // A connection is already in flight; onopen will flush the queue.
    return;
  }

  // No live socket: lazily establish one using the existing refresher.
  (async () => {
    try {
      const token = await getValidToken('hakika_rider');
      if (!token) {
        console.warn('sendTrackingMessage: no valid rider token available');
        return;
      }
      connectRiderWebSocket(token, () => {});
    } catch (e) {
      console.warn('sendTrackingMessage: failed to open rider socket', e);
    }
  })();
}

export function connectRiderWebSocket(token: string, onEvent: (event: any) => void) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${location.host}/api/v1/ws/rider?token=${token}`;

  function connect() {
    ws = new WebSocket(url);
    ws.onopen = () => { console.log('WebSocket connected'); attempt = 0; flushPending(); };
    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        if (event.type === 'order_assigned' || event.type === 'order_payment_confirmed') {
          onEvent(event);
        }
      } catch {}
    };
    ws.onclose = () => { console.log('WebSocket closed'); scheduleReconnect(); };
    ws.onerror = () => { ws?.close(); };
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    const delay = attempt === 0 ? 0 : attempt === 1 ? 2000 : attempt === 2 ? 5000 : MAX_DELAY;
    reconnectTimer = setTimeout(() => { attempt++; connect(); }, delay);
  }

  connect();
}

export function disconnectRiderWebSocket() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  ws?.close();
  ws = null;
}
