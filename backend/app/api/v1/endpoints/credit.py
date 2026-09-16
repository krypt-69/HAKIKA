from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.exceptions import HakikaHTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.repositories.business_repository import BusinessRepository
from app.repositories.credit_plan_repository import CreditPlanRepository
from app.repositories.merchant_credit_order_repository import MerchantCreditOrderRepository
from app.services.payment_service import PaymentService
from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.services.payment_policy_service import PaymentPolicyService
from app.repositories.payment_policy_repository import PaymentPolicyRepository
import uuid
import logging

router = APIRouter(prefix="/credit", tags=["credit"])
logger = logging.getLogger("hakika.credit")

def get_payment_service(db: AsyncSession = Depends(get_db)):
    payment_repo = PaymentRepository(db)
    order_repo = OrderRepository(db)
    customer_repo = CustomerRepository(db)
    ledger_repo = LedgerRepository(db)
    policy_repo = PaymentPolicyRepository(db)
    policy_service = PaymentPolicyService(policy_repo)
    return PaymentService(payment_repo, order_repo, customer_repo, ledger_repo, policy_service)

@router.get("/plans")
async def get_credit_plans(
    db: AsyncSession = Depends(get_db),
):
    repo = CreditPlanRepository(db)
    plans = await repo.list_active()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "price": float(p.price),
            "credit_amount": float(p.credit_amount),
            "description": p.description,
        }
        for p in plans
    ]

@router.get("/businesses/{business_id}/history")
async def get_credit_history(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate business exists and user owns it
    business_repo = BusinessRepository(db)
    business = await business_repo.get_by_id(uuid.UUID(business_id))
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if business.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this business")

    repo = MerchantCreditOrderRepository(db)
    orders = await repo.list_by_business(uuid.UUID(business_id))
    return [
        {
            "id": str(o.id),
            "amount_paid": float(o.amount_paid),
            "credit_received": float(o.credit_received),
            "status": o.status.value,
            "payment_reference": o.payment_reference,
            "created_at": o.initiated_at.isoformat(),
            "completed_at": o.completed_at.isoformat() if o.completed_at else None,
        }
        for o in orders
    ]

@router.post("/businesses/{business_id}/purchase")
async def purchase_credit(
    business_id: str,
    credit_plan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: PaymentService = Depends(get_payment_service),
):
    # Validate business exists and user owns it
    business_repo = BusinessRepository(db)
    business = await business_repo.get_by_id(uuid.UUID(business_id))
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if business.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this business")

    # Use the business owner's phone for STK Push (or a configured finance phone)
    phone = current_user.phone
    if not phone:
        raise HakikaHTTPException(
            status_code=400,
            detail="You need to set your phone number before purchasing credit. Go to your Profile page to add one.",
            code="PHONE_NOT_SET",
        )

    return await service.initiate_credit_purchase(
        business_id=uuid.UUID(business_id),
        credit_plan_id=uuid.UUID(credit_plan_id),
        phone=phone,
    )

@router.post("/callback")
async def credit_callback(
    request: Request,
    service: PaymentService = Depends(get_payment_service),
):
    try:
        payload = await request.json()
        return await service.process_credit_callback(payload)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Credit callback error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Credit callback processing failed")
