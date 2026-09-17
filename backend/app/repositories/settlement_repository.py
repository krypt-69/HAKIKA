from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.settlement import Settlement, SettlementStatus
import uuid
from datetime import datetime, timedelta


class SettlementRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------------------------------------------------
    # Existing methods (unchanged)
    # ------------------------------------------------------------------

    async def create(self, business_id: uuid.UUID, amount: float,
                     order_id: uuid.UUID, payment_id: uuid.UUID,
                     payout_reference: str | None = None) -> Settlement:
        settlement = Settlement(
            business_id=business_id,
            order_id=order_id,
            payment_id=payment_id,
            amount=amount,
            status=SettlementStatus.pending,
            payout_reference=payout_reference,
            next_retry_at=datetime.utcnow(),
        )
        self.db.add(settlement)
        await self.db.commit()
        await self.db.refresh(settlement)
        return settlement

    async def add_noncommit(self, business_id: uuid.UUID, amount: float,
                             order_id: uuid.UUID, payment_id: uuid.UUID,
                             payout_reference: str | None = None) -> Settlement:
        settlement = Settlement(
            business_id=business_id,
            order_id=order_id,
            payment_id=payment_id,
            amount=amount,
            status=SettlementStatus.pending,
            payout_reference=payout_reference,
            next_retry_at=datetime.utcnow(),
        )
        self.db.add(settlement)
        return settlement

    async def get_by_id(self, settlement_id: uuid.UUID) -> Settlement | None:
        result = await self.db.execute(select(Settlement).where(Settlement.id == settlement_id))
        return result.scalar_one_or_none()

    async def get_by_business(self, business_id: uuid.UUID) -> list[Settlement]:
        result = await self.db.execute(
            select(Settlement).where(Settlement.business_id == business_id)
            .order_by(Settlement.created_at.desc())
        )
        return result.scalars().all()

    async def get_pending(self) -> list[Settlement]:
        result = await self.db.execute(
            select(Settlement).where(Settlement.status == SettlementStatus.pending)
        )
        return result.scalars().all()

    async def update_status(self, settlement: Settlement, status: SettlementStatus,
                            provider_reference: str | None = None):
        settlement.status = status
        if provider_reference:
            settlement.provider_reference = provider_reference
        if status in (SettlementStatus.processing, SettlementStatus.failed):
            settlement.retry_count = (settlement.retry_count or 0) + 1
            settlement.last_retry_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(settlement)
        return settlement

    async def get_by_payment_id(self, payment_id: uuid.UUID) -> Settlement | None:
        result = await self.db.execute(
            select(Settlement).where(Settlement.payment_id == payment_id)
        )
        return result.scalar_one_or_none()

    # ------------------------------------------------------------------
    # P3 methods
    # ------------------------------------------------------------------

    async def claim_due_settlements(self, batch_size: int = 50,
                                     lease_seconds: int = 120) -> list[uuid.UUID]:
        """Claim due settlements with SKIP LOCKED.

        Returns the list of settlement ids. Each claimed row has its
        next_retry_at pushed forward by `lease_seconds`, so other workers
        will not re-claim it within that window. The caller then runs
        attempt_payout() for each id, outside any lock.
        """
        now = datetime.utcnow()
        lease_until = now + timedelta(seconds=lease_seconds)
        query = text("""
            UPDATE settlements
            SET next_retry_at = :lease_until
            WHERE id IN (
                SELECT id FROM settlements
                WHERE status IN ('pending', 'waiting_for_funds')
                  AND next_retry_at <= :now
                  AND submitted_at IS NULL
                ORDER BY next_retry_at
                LIMIT :batch_size
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id
        """)
        result = await self.db.execute(query, {
            "lease_until": lease_until,
            "now": now,
            "batch_size": batch_size,
        })
        ids = [row[0] for row in result.fetchall()]
        await self.db.commit()
        return ids

    async def mark_waiting_for_funds(self, settlement_id: uuid.UUID,
                                      reason: str,
                                      next_retry_at: datetime) -> Settlement | None:
        settlement = await self.get_by_id(settlement_id)
        if not settlement:
            return None
        now = datetime.utcnow()
        settlement.status = SettlementStatus.waiting_for_funds
        settlement.failure_reason = reason
        settlement.next_retry_at = next_retry_at
        settlement.last_retry_at = now
        settlement.retry_count = (settlement.retry_count or 0) + 1
        if settlement.first_waiting_at is None:
            settlement.first_waiting_at = now
        await self.db.commit()
        await self.db.refresh(settlement)
        return settlement

    async def mark_submitted(self, settlement_id: uuid.UUID) -> Settlement | None:
        """Set submitted_at = now().

        Must be called immediately before calling the provider. If
        submitted_at is already set, this is a no-op (idempotent).
        """
        settlement = await self.get_by_id(settlement_id)
        if not settlement:
            return None
        if settlement.submitted_at is not None:
            return settlement
        settlement.submitted_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(settlement)
        return settlement

    async def mark_processing(self, settlement_id: uuid.UUID,
                               tracking_id: str) -> Settlement | None:
        settlement = await self.get_by_id(settlement_id)
        if not settlement:
            return None
        settlement.status = SettlementStatus.processing
        settlement.provider_payout_reference = tracking_id
        settlement.failure_reason = None
        await self.db.commit()
        await self.db.refresh(settlement)
        return settlement

    async def mark_completed(self, settlement_id: uuid.UUID) -> Settlement | None:
        settlement = await self.get_by_id(settlement_id)
        if not settlement:
            return None
        settlement.status = SettlementStatus.completed
        await self.db.commit()
        await self.db.refresh(settlement)
        return settlement

    async def mark_failed(self, settlement_id: uuid.UUID,
                           reason: str) -> Settlement | None:
        settlement = await self.get_by_id(settlement_id)
        if not settlement:
            return None
        settlement.status = SettlementStatus.failed
        settlement.failure_reason = reason
        await self.db.commit()
        await self.db.refresh(settlement)
        return settlement

    async def find_unknown_submissions(self) -> list[Settlement]:
        result = await self.db.execute(
            select(Settlement).where(
                Settlement.submitted_at.isnot(None),
                Settlement.provider_payout_reference.is_(None),
            ).order_by(Settlement.submitted_at.desc())
        )
        return result.scalars().all()

    async def get_by_provider_payout_reference(self, tracking_id: str) -> Settlement | None:
        result = await self.db.execute(
            select(Settlement).where(Settlement.provider_payout_reference == tracking_id)
        )
        return result.scalar_one_or_none()

    async def get_by_payout_reference(self, ref: str) -> Settlement | None:
        result = await self.db.execute(
            select(Settlement).where(Settlement.payout_reference == ref)
        )
        return result.scalar_one_or_none()

    async def find_escalation_candidates(self) -> list[Settlement]:
        """Settlements waiting > 24h that have not yet been escalated."""
        cutoff = datetime.utcnow() - timedelta(hours=24)
        result = await self.db.execute(
            select(Settlement).where(
                Settlement.status == SettlementStatus.waiting_for_funds,
                Settlement.first_waiting_at.isnot(None),
                Settlement.first_waiting_at <= cutoff,
                Settlement.escalated_at.is_(None),
            )
        )
        return result.scalars().all()

    async def mark_escalated(self, settlement_id: uuid.UUID) -> Settlement | None:
        settlement = await self.get_by_id(settlement_id)
        if not settlement:
            return None
        settlement.escalated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(settlement)
        return settlement
