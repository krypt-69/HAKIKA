from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.services.payment_service import PaymentService
from app.core.config import settings
import uuid

router = APIRouter(prefix="/payments", tags=["payments"])

def get_payment_service(db: AsyncSession = Depends(get_db)):
    payment_repo = PaymentRepository(db)
    order_repo = OrderRepository(db)
    customer_repo = CustomerRepository(db)
    ledger_repo = LedgerRepository(db)
    return PaymentService(payment_repo, order_repo, customer_repo, ledger_repo)

@router.post("/{order_id}/initiate")
async def initiate_payment(
    order_id: str,
    service: PaymentService = Depends(get_payment_service)
):
    return await service.initiate_payment(uuid.UUID(order_id))

@router.post("/callback")
async def payment_callback(
    request: Request,
    service: PaymentService = Depends(get_payment_service)
):
    payload = await request.json()
    return await service.process_callback(payload)

@router.get("/orders/{order_id}")
async def get_payment_status(
    order_id: str,
    service: PaymentService = Depends(get_payment_service)
):
    return await service.get_payment_status(uuid.UUID(order_id))

@router.post("/mock/callback/{checkout_id}")
async def mock_callback(
    checkout_id: str,
    service: PaymentService = Depends(get_payment_service)
):
    """Simulate a successful payment callback for any checkout (mock mode)."""
    return await service.process_callback({"id": checkout_id, "paid": True})
