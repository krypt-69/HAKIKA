from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.trust_event_repository import TrustEventRepository
from app.services.order_service import OrderService
from app.schemas.order import OrderCreateRequest, OrderResponse
import uuid

router = APIRouter(prefix="/orders", tags=["orders"])

def get_order_service(db: AsyncSession = Depends(get_db)):
    order_repo = OrderRepository(db)
    customer_repo = CustomerRepository(db)
    business_repo = BusinessRepository(db)
    trust_event_repo = TrustEventRepository(db)
    return OrderService(order_repo, customer_repo, business_repo, trust_event_repo, db)

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(data: OrderCreateRequest, service: OrderService = Depends(get_order_service)):
    return await service.create_order(data)

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, service: OrderService = Depends(get_order_service)):
    return await service.get_order(uuid.UUID(order_id))

@router.put("/{order_id}/accept", response_model=OrderResponse)
async def accept_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    service: OrderService = Depends(get_order_service)
):
    return await service.accept_order(current_user, uuid.UUID(order_id))

# Customer cancellation (no auth, requires phone)
@router.put("/{order_id}/cancel", response_model=OrderResponse)
async def customer_cancel_order(
    order_id: str,
    phone: str = Query(..., description="Customer phone number"),
    service: OrderService = Depends(get_order_service)
):
    return await service.cancel_order('customer', uuid.UUID(order_id), customer_phone=phone)

# Business cancellation (requires JWT)
@router.put("/{order_id}/business-cancel", response_model=OrderResponse)
async def business_cancel_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    service: OrderService = Depends(get_order_service)
):
    return await service.cancel_order('business', uuid.UUID(order_id), user=current_user)

@router.get("/customer/my", response_model=list[OrderResponse])
async def list_my_orders(phone: str, service: OrderService = Depends(get_order_service)):
    return await service.list_orders_for_customer(phone)

@router.get("/business/my", response_model=list[OrderResponse])
async def list_my_business_orders(
    current_user: User = Depends(get_current_user),
    service: OrderService = Depends(get_order_service)
):
    return await service.list_orders_for_business(current_user)
