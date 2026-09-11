import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger("hakika.tracking")

class TrackingRegistry:
    """
    In-memory tracking ownership and latest rider location.

    Invariants:
      - One rider has zero or one active tracking order.
      - Location updates are accepted only from the rider that currently owns
        the order.
      - Assignment alone does not grant tracking rights.
      - Registry is per backend process. Multi-worker deployments are not
        globally consistent in V1.
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._active_tracking: dict[str, str] = {}
        self._latest_location: dict[str, dict] = {}

    async def start_tracking(self, rider_id: str, order_id: str) -> None:
        async with self._lock:
            previous = self._active_tracking.get(rider_id)
            self._active_tracking[rider_id] = order_id
            if previous and previous != order_id:
                # Invalidate the previous order's cached location
                self._latest_location.pop(previous, None)

    async def update_location(
        self, rider_id: str, order_id: str, location: dict
    ) -> bool:
        async with self._lock:
            if self._active_tracking.get(rider_id) != order_id:
                return False
            self._latest_location[order_id] = location
            return True

    async def stop_tracking(self, rider_id: str, order_id: str) -> None:
        async with self._lock:
            current = self._active_tracking.get(rider_id)
            if current == order_id:
                self._active_tracking.pop(rider_id, None)
                self._latest_location.pop(order_id, None)

    async def terminate_for_order(self, order_id: str) -> None:
        async with self._lock:
            riders_to_remove = [
                rid for rid, oid in self._active_tracking.items() if oid == order_id
            ]
            for rid in riders_to_remove:
                self._active_tracking.pop(rid, None)
            self._latest_location.pop(order_id, None)

    async def get_snapshot(self, order_id: str) -> dict:
        async with self._lock:
            # ownership check
            owns = any(
                oid == order_id for oid in self._active_tracking.values()
            )
            if not owns:
                return {"status": "not_tracking"}
            loc = self._latest_location.get(order_id)
            if not loc:
                return {"status": "awaiting_location"}
            return {"status": "ok", **loc}

tracking_registry = TrackingRegistry()
