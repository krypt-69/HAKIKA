let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let attempt = 0;
const MAX_DELAY = 10_000;

export function connectRiderWebSocket(token: string, onEvent: (event: any) => void) {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${location.host}/api/v1/ws/rider?token=${token}`;

  function connect() {
    ws = new WebSocket(url);
    ws.onopen = () => { console.log('WebSocket connected'); attempt = 0; };
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
