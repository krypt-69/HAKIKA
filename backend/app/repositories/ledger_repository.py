from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ledger_entry import LedgerEntry, LedgerTransactionType
import uuid

class LedgerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_entry(
        self, transaction_type: LedgerTransactionType, amount: float,
        order_id: uuid.UUID | None = None, payment_id: uuid.UUID | None = None,
        business_id: uuid.UUID | None = None
    ) -> LedgerEntry:
        entry = LedgerEntry(
            transaction_type=transaction_type,
            amount=amount,
            order_id=order_id,
            payment_id=payment_id,
            business_id=business_id
        )
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        return entry
