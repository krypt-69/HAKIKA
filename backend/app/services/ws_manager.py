import logging
from fastapi import WebSocket

logger = logging.getLogger("hakika.ws")

class ConnectionManager:

    # ── Order-scoped connections for customers ──────────────────────
    def __init__(self):
        self.active_connections: dict[str, set[WebSocket]] = {}
        self.order_connections: dict[str, set[WebSocket]] = {}

    async def connect_order(self, order_id: str, websocket: WebSocket):
        if order_id not in self.order_connections:
            self.order_connections[order_id] = set()
        self.order_connections[order_id].add(websocket)
        logger.info(f"Customer WebSocket connected for order {order_id} (total: {len(self.order_connections[order_id])})")

    def disconnect_order(self, order_id: str, websocket: WebSocket):
        if order_id in self.order_connections:
            self.order_connections[order_id].discard(websocket)
            if not self.order_connections[order_id]:
                del self.order_connections[order_id]
            logger.info(f"Customer WebSocket disconnected for order {order_id}")

    async def send_to_order(self, order_id: str, event: dict):
        ws_set = self.order_connections.get(order_id)
        if not ws_set:
            return
        dead: list[WebSocket] = []
        for ws in list(ws_set):
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect_order(order_id, ws)
            logger.warning(f"Removed dead customer socket for order {order_id}")


    async def connect(self, rider_id: str, websocket: WebSocket):
        if rider_id not in self.active_connections:
            self.active_connections[rider_id] = set()
        self.active_connections[rider_id].add(websocket)
        logger.info(f"WebSocket connected for rider {rider_id} (total: {len(self.active_connections[rider_id])})")

    def disconnect(self, rider_id: str, websocket: WebSocket):
        if rider_id in self.active_connections:
            self.active_connections[rider_id].discard(websocket)
            if not self.active_connections[rider_id]:
                del self.active_connections[rider_id]
            logger.info(f"WebSocket disconnected for rider {rider_id}")

    async def send_event(self, rider_id: str, event: dict):
        ws_set = self.active_connections.get(rider_id)
        if not ws_set:
            return
        dead: list[WebSocket] = []
        # Iterate over a snapshot to avoid mutation issues during cleanup
        for ws in list(ws_set):
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(rider_id, ws)
            logger.warning(f"Removed dead socket for rider {rider_id}")


manager = ConnectionManager()
