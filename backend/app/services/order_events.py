from datetime import datetime, timezone
from app.services.ws_manager import manager
from app.models.order import OrderStatus
from app.repositories.delivery_repository import DeliveryRepository
from app.database.session import async_session
from app.services.ws_manager import manager


async def _publish_rider_payment_confirmed(order):
    """Notify the assigned rider (if any) that payment has been confirmed."""
    async with async_session() as db:
        delivery_repo = DeliveryRepository(db)
        assignment = await delivery_repo.get_active_assignment(order.id)
        if not assignment:
            return

    event = {
        "type": "order_payment_confirmed",
        "payload": {
            "order_id": str(order.id),
            "order_number": order.order_number,
            "payment_status": "paid",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
    await manager.send_event(str(assignment.rider_id), event)

async def publish_order_update(order, previous_status):
    """Publish a WebSocket event to all customers tracking this order."""
    new_status = order.status
    if previous_status == new_status:
        return
    event = {
        "type": "order_status_changed",
        "payload": {
            "order_id": str(order.id),
            "order_number": order.order_number,
            "new_status": new_status.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
    await manager.send_to_order(str(order.id), event)

    if new_status == OrderStatus.paid:
        await _publish_rider_payment_confirmed(order)
