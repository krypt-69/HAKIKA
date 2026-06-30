from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.repositories.delivery_repository import DeliveryRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.rider_repository import RiderRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.customer_repository import CustomerRepository
from app.services.delivery_service import DeliveryService
from app.models.order import OrderStatus
from app.models.delivery_attempt import DeliveryAttemptStatus
import uuid

router = APIRouter(prefix="/delivery", tags=["delivery"])

def get_delivery_service(db: AsyncSession = Depends(get_db)):
    delivery_repo = DeliveryRepository(db)
    order_repo = OrderRepository(db)
    rider_repo = RiderRepository(db)
    business_repo = BusinessRepository(db)
    return DeliveryService(delivery_repo, order_repo, rider_repo, business_repo)

@router.put("/orders/{order_id}/assign")
async def assign_rider(
    order_id: str,
    rider_id: str,
    current_user: User = Depends(get_current_user),
    service: DeliveryService = Depends(get_delivery_service)
):
    await service.assign_rider(current_user, uuid.UUID(order_id), uuid.UUID(rider_id))
    return {"status": "assigned"}

@router.put("/orders/{order_id}/arrive")
async def mark_arrived(
    order_id: str,
    gps_lat: float,
    gps_lon: float,
    photo_url: str | None = None,
    current_user: User = Depends(get_current_user),
    service: DeliveryService = Depends(get_delivery_service)
):
    await service.mark_arrived(current_user, uuid.UUID(order_id), gps_lat, gps_lon, photo_url)
    return {"status": "arrived"}

@router.put("/orders/{order_id}/attempt")
async def record_attempt(
    order_id: str,
    status: DeliveryAttemptStatus,
    gps_lat: float,
    gps_lon: float,
    photo_url: str | None = None,
    current_user: User = Depends(get_current_user),
    service: DeliveryService = Depends(get_delivery_service)
):
    await service.record_failed_attempt(current_user, uuid.UUID(order_id), status, gps_lat, gps_lon)
    return {"status": "recorded"}

@router.get("/orders/{order_id}")
async def get_order_for_rider(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Use DeliveryService to validate rider assignment
    delivery_repo = DeliveryRepository(db)
    order_repo = OrderRepository(db)
    rider_repo = RiderRepository(db)
    business_repo = BusinessRepository(db)
    service = DeliveryService(delivery_repo, order_repo, rider_repo, business_repo)
    order_data = await service.get_order_for_rider(current_user, uuid.UUID(order_id))

    # Add customer phone only if arrived
    order = await order_repo.get_by_id(uuid.UUID(order_id))
    if order.status in (OrderStatus.arrived, OrderStatus.customer_confirmed_delivery, OrderStatus.payment_pending, OrderStatus.paid, OrderStatus.completed):
        customer_repo = CustomerRepository(db)
        customer = await customer_repo.get_by_id(order.customer_id)
        order_data['customer_phone'] = customer.phone_normalized if customer else None
    else:
        order_data['customer_phone'] = None

    # Add items
    items = await order_repo.get_order_items(order.id)
    order_data['items'] = [{"product_name": i.product_name, "unit_price": float(i.unit_price), "quantity": i.quantity} for i in items]
    return order_data
