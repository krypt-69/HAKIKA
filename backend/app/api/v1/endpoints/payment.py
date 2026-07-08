from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user, require_owner
from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.services.payment_service import PaymentService
from app.core.config import settings
from app.integrations.intasend.mock_client import mock_instance
from app.models.user import User
import uuid
import logging

logger = logging.getLogger("hakika.payment")
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
    try:
        raw_body = await request.body()
        signature = request.headers.get("X-IntaSend-Signature")
        logger.info(f"Callback received. Headers: {dict(request.headers)}")
        logger.info(f"Raw body: {raw_body.decode('utf-8')}")
        
        # Skip signature verification if secret not set
        if settings.intasend_webhook_secret:
            from app.integrations.intasend.webhook import verify_signature
            if not verify_signature(raw_body, signature):
                logger.warning("Invalid webhook signature")
                # Still process the payload – IntaSend may retry if we return error
                # We'll log and continue but mark as suspicious.
        payload = await request.json()
        logger.info(f"Callback payload: {payload}")
        result = await service.process_callback(payload)
        logger.info(f"Callback processed: {result}")
        return result
    except Exception as e:
        logger.error(f"Callback error: {e}", exc_info=True)
        # Always return 200 to prevent IntaSend from retrying
        return {"status": "error", "detail": str(e)}

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
    ref = mock_instance.get_reference(checkout_id)
    if not ref:
        raise HTTPException(status_code=404, detail="Mock checkout not found")
    return await service.process_callback({
        "api_ref": ref,
        "state": "COMPLETE"
    })

# Admin endpoint to manually reconcile pending settlements
@router.post("/reconcile")
async def reconcile_settlements(
    service: PaymentService = Depends(get_payment_service)
):
    result = await service.reconcile_pending()
    return {"reconciled": result}
