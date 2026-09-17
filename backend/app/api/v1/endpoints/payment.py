from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user, require_owner
from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.payment_policy_repository import PaymentPolicyRepository
from app.services.payment_policy_service import PaymentPolicyService
from app.repositories.payment_policy_repository import PaymentPolicyRepository
from app.services.payment_policy_service import PaymentPolicyService
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
    policy_repo = PaymentPolicyRepository(db)
    policy_service = PaymentPolicyService(policy_repo)
    policy_repo = PaymentPolicyRepository(db)
    policy_service = PaymentPolicyService(policy_repo)
    return PaymentService(payment_repo, order_repo, customer_repo, ledger_repo, policy_service)

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
        payload = await request.json()
        return await service.process_callback(payload)
    except HTTPException:
        # Re-raise so FastAPI returns the correct status code
        raise
    except Exception as e:
        logger.error(f"Callback error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Callback processing failed")



@router.post("/intasend/callback")
async def intasend_callback(
    request: Request,
    service: PaymentService = Depends(get_payment_service),
):
    """Dedicated IntaSend callback endpoint (fail-closed)."""
    from app.payment.providers.intasend_callback import (
        normalise_intasend_callback,
        validate_intasend_challenge,
    )
    payload = await request.json()
    if not validate_intasend_challenge(payload, settings.intasend_challenge):
        logger.warning("IntaSend callback rejected: invalid or missing challenge")
        raise HTTPException(status_code=401, detail="Invalid challenge")
    normalised = normalise_intasend_callback(payload)
    if normalised.get("state") == "UNRECOGNISED":
        raise HTTPException(status_code=422, detail="Unrecognised IntaSend callback state")
    return await service.process_callback(normalised)



@router.post("/intasend/payout-callback")
async def intasend_payout_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Defensive handler for IntaSend Send Money (B2B) callbacks.

    NOTE: The exact callback contract is captured from the sandbox in
    E2E-1 and the parser is frozen against the observed shape. Until
    then, this handler:
      - validates the challenge (fail-closed)
      - attempts correlation by tracking_id, then by our payout_reference
      - logs the full raw payload at WARNING for every request
      - returns 200 for anything it cannot correlate (no retry storm)
      - only mutates state on a recognised status_code
    """
    from app.repositories.settlement_repository import SettlementRepository
    from app.models.settlement import SettlementStatus

    raw = await request.json()
    logger.warning(f"IntaSend B2B callback raw: {raw}")

    incoming_challenge = raw.get("challenge")
    if not settings.intasend_challenge or incoming_challenge != settings.intasend_challenge:
        raise HTTPException(status_code=401, detail="Invalid challenge")

    repo = SettlementRepository(db)

    # Correlate settlement
    settlement = None
    tracking_id = raw.get("tracking_id")
    if tracking_id:
        settlement = await repo.get_by_provider_payout_reference(str(tracking_id))
    if settlement is None and raw.get("reference"):
        settlement = await repo.get_by_payout_reference(str(raw.get("reference")))
    if settlement is None:
        txs = raw.get("transactions")
        if isinstance(txs, list) and txs:
            ref = txs[0].get("reference")
            if ref:
                settlement = await repo.get_by_payout_reference(str(ref))

    if settlement is None:
        logger.warning("IntaSend B2B callback: no settlement matched")
        return {"status": "ignored", "reason": "no_match"}

    if settlement.status in (SettlementStatus.completed, SettlementStatus.failed):
        return {"status": "already_terminal", "state": settlement.status.value}

    # Extract status_code
    status_code = None
    txs = raw.get("transactions")
    if isinstance(txs, list) and txs:
        status_code = txs[0].get("status_code") or raw.get("status_code")
    else:
        status_code = raw.get("status_code")

    if status_code == "TS100":
        await repo.mark_completed(settlement.id)
        return {"status": "completed"}
    if status_code in ("TF106", "TF103", "BF102", "BF105", "BF107", "TC108", "BE111"):
        await repo.mark_failed(settlement.id, reason=f"intasend_rejected_{status_code}")
        return {"status": "failed", "code": status_code}
    if status_code == "TF105":
        logger.warning(f"IntaSend B2B callback TF105 pending for settlement {settlement.id}")
        return {"status": "processing", "code": status_code}

    logger.warning(f"IntaSend B2B callback unhandled status_code={status_code}")
    return {"status": "ignored", "code": status_code}


@router.get("/orders/{order_id}")
async def get_payment_status(
    order_id: str,
    service: PaymentService = Depends(get_payment_service)
):
    payment = await service.payment_repo.get_by_order(uuid.UUID(order_id))
    if not payment:
        return {"status": "not_initiated"}
    return {
        "status": payment.status.value,
        "amount": float(payment.amount),
    }

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
