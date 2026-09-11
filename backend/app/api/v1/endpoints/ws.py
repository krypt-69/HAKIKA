from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.security import decode_access_token
from app.models.user import UserRole
from app.repositories.user_repository import UserRepository
from app.models.rider import Rider
from app.database.session import async_session
from app.services.ws_manager import manager
from app.services.tracking_registry import tracking_registry
from sqlalchemy import select
import uuid
import json
from datetime import datetime, timezone

router = APIRouter()

@router.websocket("/ws/rider")
async def rider_websocket(websocket: WebSocket, token: str = Query("")):
    if not token:
        await websocket.close(code=4001)
        return

    """
    WebSocket endpoint for riders.

    Token is passed in the query string because browser WebSocket APIs
    cannot set Authorization headers consistently for PWAs.
    If the token is missing, FastAPI returns a 403 automatically.
    """
    # 1. Validate JWT
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        role = payload.get("role")
        if not user_id or role != "rider":
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    # 2. Verify user exists and is a rider
    async with async_session() as db:
        repo = UserRepository(db)
        user = await repo.get_by_id(uuid.UUID(user_id))
        if not user or user.role != UserRole.rider:
            await websocket.close(code=4001)
            return
        rider_result = await db.execute(
            select(Rider).where(Rider.user_id == user.id)
        )
        rider = rider_result.scalar_one_or_none()
        if not rider:
            await websocket.close(code=4001)
            return
        rider_id = str(rider.id)

    # 3. Accept and register
    await websocket.accept()
    await manager.connect(rider_id, websocket)

    # 4. Message loop – handle tracking messages and ignore others
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            mtype = msg.get("type")

            if mtype == "start_tracking":
                await _handle_start_tracking(rider_id, msg)
            elif mtype == "location_update":
                await _handle_location_update(rider_id, msg)
            elif mtype == "stop_tracking":
                await _handle_stop_tracking(rider_id, msg)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(rider_id, websocket)

# TEMPORARY test endpoint – no auth
@router.websocket("/ws/test")
async def test_ws(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("hello")
    await websocket.close()

@router.websocket("/ws/customer")
async def customer_websocket(
    websocket: WebSocket,
    order_id: str = Query(...),
    phone: str = Query(...),
):
    """Order-scoped WebSocket for customers. Validates phone against order."""
    # Normalize phone (reuse existing logic from confirmation_service)
    if phone.startswith("0"):
        normalized = "+254" + phone[1:]
    elif phone.startswith("254"):
        normalized = "+" + phone
    else:
        normalized = phone

    # Fetch order
    from app.models.order import Order
    from app.models.customer import Customer
    from app.database.session import async_session
    from sqlalchemy import select
    import uuid as uuid_mod

    try:
        oid = uuid_mod.UUID(order_id)
    except ValueError:
        await websocket.close(code=4404)
        return

    async with async_session() as db:
        result = await db.execute(select(Order).where(Order.id == oid))
        order = result.scalar_one_or_none()
        if not order:
            await websocket.close(code=4404)
            return

        # Fetch customer to get phone_normalized
        customer = await db.get(Customer, order.customer_id) if order.customer_id else None
        if not customer:
            await websocket.close(code=4001)
            return

        # Compare normalized phone with customer.phone_normalized
        if normalized != customer.phone_normalized:
            await websocket.close(code=4001)
            return

    # Accept and register
    await websocket.accept()
    await manager.connect_order(order_id, websocket)

    try:
        while True:
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect_order(order_id, websocket)



# ── Tracking helpers ────────────────────────────────────────────

async def _load_order(order_id: str):
    from app.models.order import Order
    try:
        oid = uuid.UUID(order_id)
    except ValueError:
        return None
    async with async_session() as db:
        result = await db.execute(select(Order).where(Order.id == oid))
        return result.scalar_one_or_none()


async def _rider_assigned_to_order(order_id: uuid.UUID, rider_id: uuid.UUID) -> bool:
    from app.repositories.delivery_repository import DeliveryRepository
    async with async_session() as db:
        repo = DeliveryRepository(db)
        assignment = await repo.get_active_assignment(order_id)
        return assignment is not None and str(assignment.rider_id) == str(rider_id)


async def _handle_start_tracking(rider_id: str, msg: dict) -> None:
    from app.models.order import OrderStatus
    order_id = msg.get("order_id")
    if not order_id:
        return
    order = await _load_order(order_id)
    if not order:
        return
    if order.status != OrderStatus.out_for_delivery:
        return
    if not await _rider_assigned_to_order(order.id, uuid.UUID(rider_id)):
        return
    await tracking_registry.start_tracking(rider_id, order_id)


async def _handle_location_update(rider_id: str, msg: dict) -> None:
    from app.models.order import OrderStatus
    order_id = msg.get("order_id")
    if not order_id:
        return
    order = await _load_order(order_id)
    if not order:
        return
    if order.status != OrderStatus.out_for_delivery:
        return
    if not await _rider_assigned_to_order(order.id, uuid.UUID(rider_id)):
        return

    location = {
        "latitude": msg.get("latitude"),
        "longitude": msg.get("longitude"),
        "heading": msg.get("heading"),
        "speed": msg.get("speed"),
        "timestamp": msg.get("timestamp") or datetime.now(timezone.utc).isoformat(),
    }

    accepted = await tracking_registry.update_location(rider_id, order_id, location)
    if not accepted:
        return

    await manager.send_to_order(
        order_id,
        {
            "type": "rider_location",
            **location,
        },
    )


async def _handle_stop_tracking(rider_id: str, msg: dict) -> None:
    order_id = msg.get("order_id")
    if not order_id:
        return
    await tracking_registry.stop_tracking(rider_id, order_id)
