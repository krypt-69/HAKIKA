from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.security import decode_access_token
from app.models.user import UserRole
from app.repositories.user_repository import UserRepository
from app.models.rider import Rider
from app.database.session import async_session
from app.services.ws_manager import manager
from sqlalchemy import select
import uuid

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

    # 4. Keep-alive – no custom heartbeat
    try:
        while True:
            _ = await websocket.receive_text()
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

