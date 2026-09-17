"""P3 — Settlement retry worker.

Runs a periodic loop that:
  1. claims due settlements via SELECT ... FOR UPDATE SKIP LOCKED
  2. for each claimed settlement, calls SettlementService.attempt_payout()
  3. escalates settlements that have been in waiting_for_funds for > 24h

The worker is designed to be safe under both single-process and
multi-process deployment. No in-memory state is relied upon. The
database is authoritative. No DB lock is held across an external HTTP
call.
"""
import asyncio
import logging
from datetime import datetime, timedelta

from app.database.session import async_session
from app.repositories.settlement_repository import SettlementRepository
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.services.settlement_service import SettlementService
from app.models.audit_log import AuditLog

logger = logging.getLogger("hakika.settlement_retry")

TICK_SECONDS = 30
BATCH_SIZE = 50


async def _run_once() -> None:
    async with async_session() as db:
        settlement_repo = SettlementRepository(db)
        ledger_repo = LedgerRepository(db)
        business_repo = BusinessRepository(db)
        pm_repo = PaymentMethodRepository(db)
        service = SettlementService(settlement_repo, ledger_repo,
                                     business_repo, pm_repo)

        # 1. Claim due settlements
        try:
            claimed_ids = await settlement_repo.claim_due_settlements(
                batch_size=BATCH_SIZE, lease_seconds=120
            )
        except Exception as e:
            logger.error(f"Claim failed: {e}")
            return

        for sid in claimed_ids:
            try:
                result = await service.attempt_payout(sid)
                logger.info(f"settlement {sid}: {result}")
            except Exception as e:
                logger.error(f"attempt_payout failed for {sid}: {e}")

        # 2. Escalation: waiting > 24h with no escalated_at
        try:
            candidates = await settlement_repo.find_escalation_candidates()
            for s in candidates:
                await settlement_repo.mark_escalated(s.id)
                audit = AuditLog(
                    table_name="settlements",
                    record_id=s.id,
                    action="SETTLEMENT_ESCALATED",
                    changed_by=None,
                    new_values={"reason": "waiting_for_funds_over_24h"},
                )
                db.add(audit)
            if candidates:
                await db.commit()
                logger.warning(f"Escalated {len(candidates)} settlement(s)")
        except Exception as e:
            logger.error(f"Escalation step failed: {e}")


async def settlement_retry_loop() -> None:
    """Main worker loop. Runs until the process stops."""
    logger.info("Settlement retry worker started")
    while True:
        try:
            await _run_once()
        except Exception as e:
            logger.error(f"Retry loop iteration failed: {e}")
        await asyncio.sleep(TICK_SECONDS)
