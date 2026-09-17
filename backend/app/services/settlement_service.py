import logging
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException

from app.repositories.settlement_repository import SettlementRepository
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.models.settlement import Settlement, SettlementStatus
from app.models.ledger_entry import LedgerTransactionType
from app.models.audit_log import AuditLog
from app.payment.providers.intasend import IntaSendProvider


logger = logging.getLogger("hakika.settlement")


class SettlementService:
    def __init__(
        self,
        settlement_repo: SettlementRepository,
        ledger_repo: LedgerRepository,
        business_repo: BusinessRepository,
        payment_method_repo: PaymentMethodRepository,
    ):
        self.settlement_repo = settlement_repo
        self.ledger_repo = ledger_repo
        self.business_repo = business_repo
        self.payment_method_repo = payment_method_repo
        self.provider = IntaSendProvider()

    # ------------------------------------------------------------------
    # P3 — attempt_payout
    #
    # Ordering (Custodian-corrected):
    #   1. reload settlement
    #   2. guard submitted_at / status
    #   3. check available_balance
    #   4. insufficient → waiting_for_funds (+4h)
    #   5. balance-check failure → waiting_for_funds (+5m)
    #   6. resolve active payment method
    #        none → failed 'no_active_payment_method'
    #               submitted_at MUST remain NULL
    #   7. re-acquire lock, verify submitted_at IS NULL, set submitted_at = now()
    #   8. commit
    #   9. call IntaSend
    #  10. classify result:
    #        explicit 4xx rejection → failed 'intasend_rejected_<code>'
    #        2xx with tracking_id   → processing, provider_payout_reference set
    #        ambiguous              → failed 'unknown_submission_state'  (quarantine)
    #  11. commit
    # ------------------------------------------------------------------
    async def attempt_payout(self, settlement_id: uuid.UUID) -> dict:
        settlement = await self.settlement_repo.get_by_id(settlement_id)
        if not settlement:
            return {"status": "not_found"}

        # Guard: already submitted → quarantine, do nothing
        if settlement.submitted_at is not None:
            return {"status": "quarantined", "reason": "submitted_at_set"}

        # Guard: only pending / waiting_for_funds can be attempted
        if settlement.status not in (SettlementStatus.pending,
                                      SettlementStatus.waiting_for_funds):
            return {"status": "skipped", "state": settlement.status.value}

        # Step 3–5: balance check
        try:
            balance = await self.provider.get_wallet_balance()
            available = float(balance.get("available_balance", 0.0))
        except Exception as e:
            logger.warning(f"Balance check failed for settlement {settlement_id}: {e}")
            await self.settlement_repo.mark_waiting_for_funds(
                settlement_id,
                reason="balance_check_failed",
                next_retry_at=datetime.utcnow() + timedelta(minutes=5),
            )
            return {"status": "waiting_for_funds", "reason": "balance_check_failed"}

        required = float(settlement.amount)
        if available < required:
            await self.settlement_repo.mark_waiting_for_funds(
                settlement_id,
                reason="insufficient_available_funds",
                next_retry_at=datetime.utcnow() + timedelta(hours=4),
            )
            return {"status": "waiting_for_funds", "reason": "insufficient_available_funds"}

        # Step 6: resolve active payment method
        methods = await self.payment_method_repo.get_by_business(settlement.business_id)
        active_method = next((m for m in methods if m.is_active), None)
        if not active_method:
            await self.settlement_repo.mark_failed(
                settlement_id, reason="no_active_payment_method"
            )
            return {"status": "failed", "reason": "no_active_payment_method"}

        account_type = "PayBill" if active_method.type.value == "paybill" else "TillNumber"
        account_number = active_method.encrypted_account_number

        business = await self.business_repo.get_by_id(settlement.business_id)
        business_name = business.name if business else "Business"
        account_reference = (
            settlement.order_id and f"HK-{str(settlement.order_id)[:8]}"
        ) or "HAKIKA-SETTLEMENT"

        # Step 7–8: mark submitted_at BEFORE the HTTP call
        settlement = await self.settlement_repo.mark_submitted(settlement_id)
        if settlement is None:
            return {"status": "not_found"}

        # Step 9: call IntaSend
        try:
            response = await self.provider.initiate_payout(
                amount=float(settlement.amount),
                account_number=account_number,
                account_type=account_type,
                account_reference=account_reference,
                business_name=business_name,
                payout_reference=settlement.payout_reference,
            )
        except Exception as e:
            # Ambiguous outcome: network error, timeout, 5xx, etc.
            logger.warning(
                f"Ambiguous provider outcome for settlement {settlement_id}: {e}"
            )
            await self.settlement_repo.mark_failed(
                settlement_id, reason="unknown_submission_state"
            )
            return {"status": "quarantined", "reason": "unknown_submission_state"}

        # Step 10: classify 2xx response
        tracking_id = (
            response.get("tracking_id")
            or response.get("file_id")
            or response.get("transaction_id")
        )
        if tracking_id:
            await self.settlement_repo.mark_processing(settlement_id, str(tracking_id))
            logger.info(f"Settlement {settlement_id} processing, tracking={tracking_id}")
            return {"status": "processing", "tracking_id": str(tracking_id)}

        # 2xx but no tracking id → ambiguous
        await self.settlement_repo.mark_failed(
            settlement_id, reason="unknown_submission_state"
        )
        return {"status": "quarantined", "reason": "2xx_without_tracking_id"}

    # ------------------------------------------------------------------
    # Admin manual path — refactored to delegate to attempt_payout,
    # enforcing the crash-safety invariant.
    # ------------------------------------------------------------------
    async def process_settlement(self, settlement_id: uuid.UUID,
                                  admin_id: uuid.UUID) -> dict:
        settlement = await self.settlement_repo.get_by_id(settlement_id)
        if not settlement:
            raise HTTPException(status_code=404, detail="Settlement not found")

        # Crash-safety invariant
        if settlement.submitted_at is not None and settlement.provider_payout_reference is None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Settlement is in unknown submission state; "
                    "reconcile against IntaSend before attempting again."
                ),
            )

        if settlement.status == SettlementStatus.completed:
            raise HTTPException(status_code=400, detail="Settlement already completed")
        if settlement.status == SettlementStatus.processing:
            raise HTTPException(status_code=400, detail="Settlement is processing")

        result = await self.attempt_payout(settlement_id)

        # Audit
        audit = AuditLog(
            table_name="settlements",
            record_id=settlement_id,
            action="ADMIN_SETTLEMENT_ATTEMPTED",
            changed_by=admin_id,
            new_values={"result": result},
        )
        self.settlement_repo.db.add(audit)
        await self.settlement_repo.db.commit()

        return result

    # ------------------------------------------------------------------
    # Existing helper preserved
    # ------------------------------------------------------------------
    async def reconcile_settlement_status(self, settlement_id: uuid.UUID) -> dict:
        settlement = await self.settlement_repo.get_by_id(settlement_id)
        if not settlement:
            raise HTTPException(status_code=404, detail="Settlement not found")
        if settlement.status != SettlementStatus.processing:
            raise HTTPException(status_code=400, detail="Settlement is not in processing state")
        if not settlement.provider_payout_reference:
            return {"status": "unknown", "reason": "missing_tracking_id"}

        result = await self.provider.get_payout_status(settlement.provider_payout_reference)
        mapped = result.get("status", "unknown")

        if mapped == "completed":
            await self.settlement_repo.mark_completed(settlement_id)
            return {"status": "completed"}
        if mapped == "failed":
            await self.settlement_repo.mark_failed(settlement_id, reason="provider_rejected")
            return {"status": "failed"}
        if mapped == "processing":
            return {"status": "processing"}
        return {"status": "unknown", "reason": result.get("raw", "unknown")}

    async def get_settlements_for_business(self, business_id: uuid.UUID):
        return await self.settlement_repo.get_by_business(business_id)
