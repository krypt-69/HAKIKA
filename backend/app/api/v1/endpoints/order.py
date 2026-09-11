from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.core.exceptions import HakikaHTTPException
from app.models.user import User
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.trust_event_repository import TrustEventRepository
from app.api.v1.endpoints.credit import get_payment_service
from app.services.order_service import OrderService
from app.services.order_events import publish_order_update
from app.services.tracking_registry import tracking_registry
from app.services.payment_service import PaymentService
from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.services.payment_policy_service import PaymentPolicyService
from app.repositories.payment_policy_repository import PaymentPolicyRepository
from app.models.order import OrderStatus
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

@router.get("/{order_id}")
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

@router.post("/{order_id}/pay")
async def pay_order(
    order_id: str,
    phone: str = Query(..., description="Customer phone number"),
    service: PaymentService = Depends(get_payment_service),
    order_service: OrderService = Depends(get_order_service),
):
    """Customer initiates payment for an order (prepaid dispatch flow)."""
    order = await order_service.get_order(uuid.UUID(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "accepted":
        raise HTTPException(status_code=400, detail="Order is not in accepted state")
    # Verify customer phone (reuse existing verification)
    from app.services.confirmation_service import ConfirmationService
    # phone normalization
    if phone.startswith("0"):
        normalized = "+254" + phone[1:]
    elif phone.startswith("254"):
        normalized = "+" + phone
    else:
        normalized = phone
    # Check business toggle
    from app.repositories.business_repository import BusinessRepository
    business_repo = BusinessRepository(service.payment_repo.db)
    business = await business_repo.get_by_id(order.business_id)
    if not business or business.payment_model != "credit" or not business.collect_payment_before_delivery:
        raise HakikaHTTPException(status_code=409, detail="Payment before delivery is not enabled for this business.", code="PREPAID_NOT_ENABLED")
    # Idempotency checks
    state = await service.get_order_payment_state(uuid.UUID(order_id))
    if state == "paid":
        return {"status": "already_paid"}
    if state == "pending":
        return {"status": "payment_already_pending"}
    # Fetch the ORM order to transition status
    order_orm = await order_service.order_repo.get_by_id(uuid.UUID(order_id))
    if not order_orm:
        raise HTTPException(status_code=404, detail="Order not found")
    prev = order_orm.status
    await order_service.order_repo.transition_status(
        order_id=order_orm.id,
        new_status=OrderStatus.payment_pending,
        visible_to_customer=True,
    )
    await publish_order_update(order_orm, prev)
    result = await service.initiate_payment(uuid.UUID(order_id))
    return result


@router.post("/{order_id}/pay")
async def pay_order(
    order_id: str,
    phone: str,
    service: PaymentService = Depends(get_payment_service),
    order_service: OrderService = Depends(get_order_service),
    business_repo: BusinessRepository = Depends(lambda db=Depends(get_db): BusinessRepository(db)),
):
    """Customer initiates payment for an order (prepaid dispatch flow)."""
    # Fetch order
    order = await order_service.get_order(uuid.UUID(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "accepted":
        raise HTTPException(status_code=400, detail="Order is not in accepted state")
    # Verify customer phone
    if phone.startswith("0"):
        normalized = "+254" + phone[1:]
    elif phone.startswith("254"):
        normalized = "+" + phone
    else:
        normalized = phone
    customer_repo = CustomerRepository(service.payment_repo.db)
    customer = await customer_repo.get_or_create(phone, normalized)
    if order.customer_id != customer.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    # Check business toggle
    business = await business_repo.get_by_id(order.business_id)
    if not business or business.payment_model != "credit" or not business.collect_payment_before_delivery:
        raise HakikaHTTPException(status_code=409, detail="Payment before delivery is not enabled for this business.", code="PREPAID_NOT_ENABLED")
    # Idempotency checks
    state = await service.get_order_payment_state(uuid.UUID(order_id))
    if state == "paid":
        return {"status": "already_paid"}
    if state == "pending":
        return {"status": "payment_already_pending"}
    # Initiate payment
    result = await service.initiate_payment(uuid.UUID(order_id))
    return result
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


@router.get("/{order_id}/rider-location")
async def get_rider_location(
    order_id: str,
    phone: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Authorized snapshot of the current rider's location for an order.

    Returns one of:
      - {"status": "not_tracking"}              (no active tracking)
      - {"status": "awaiting_location"}         (ownership exists, no GPS yet)
      - {"status": "ok", "latitude": ...}       (latest known location)
    """
    from app.models.customer import Customer

    # Normalize phone
    if phone.startswith("0"):
        normalized = "+254" + phone[1:]
    elif phone.startswith("254"):
        normalized = "+" + phone
    else:
        normalized = phone

    try:
        oid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Order not found")

    order_repo = OrderRepository(db)
    order = await order_repo.get_by_id(oid)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    customer_repo = CustomerRepository(db)
    customer = await customer_repo.get_by_id(order.customer_id)
    if not customer or customer.phone_normalized != normalized:
        raise HTTPException(status_code=403, detail="Forbidden")

    snapshot = await tracking_registry.get_snapshot(order_id)
    return snapshot
