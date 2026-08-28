from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.repositories.customer_repository import CustomerRepository
from app.repositories.order_notification_repository import OrderNotificationRepository
from app.models.order_notification import OrderNotification
from app.models.order import Order
from app.models.customer import Customer
import uuid

router = APIRouter(prefix="/notifications", tags=["notifications"])

async def resolve_customer(phone: str, db: AsyncSession) -> Customer:
    """Normalize phone and return customer or raise 404."""
    if phone.startswith("0"):
        normalized = "+254" + phone[1:]
    elif phone.startswith("254"):
        normalized = "+" + phone
    else:
        normalized = phone
    result = await db.execute(
        select(Customer).where(Customer.phone_normalized == normalized)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.get("/unread-count")
async def unread_count(
    phone: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    customer = await resolve_customer(phone, db)
    repo = OrderNotificationRepository(db)
    notifications = await repo.list_unread_for_customer(customer.id)
    return {"count": len(notifications)}

@router.get("")
async def list_notifications(
    phone: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    customer = await resolve_customer(phone, db)
    repo = OrderNotificationRepository(db)
    notifications = await repo.list_unread_for_customer(customer.id)
    return [
        {
            "order_id": str(n.order_id),
            "unread_count": n.unread_count,
            "updated_at": n.updated_at.isoformat() if n.updated_at else None,
        }
        for n in notifications
    ]

@router.post("/order/{order_id}/read")
async def mark_notification_read(
    order_id: str,
    phone: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    customer = await resolve_customer(phone, db)
    try:
        oid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Order not found")

    result = await db.execute(
        select(Order).where(
            Order.id == oid,
            Order.customer_id == customer.id,
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=403, detail="Not your order")

    repo = OrderNotificationRepository(db)
    notification = await repo.get_by_customer_and_order(customer.id, oid)
    if notification:
        await repo.mark_read(notification)
    return {"status": "read"}
