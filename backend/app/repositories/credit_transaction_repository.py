from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.credit_transaction import CreditTransaction, CreditTransactionType, CreditTransactionDirection, CreditTransactionStatus
import uuid

class CreditTransactionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, transaction_data: dict) -> CreditTransaction:
        transaction = CreditTransaction(**transaction_data)
        self.db.add(transaction)
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def get_by_order_id(self, order_id: uuid.UUID) -> list[CreditTransaction]:
        result = await self.db.execute(
            select(CreditTransaction).where(CreditTransaction.order_id == order_id)
        )
        return result.scalars().all()

    async def get_by_merchant_credit_order_id(self, mco_id: uuid.UUID) -> list[CreditTransaction]:
        result = await self.db.execute(
            select(CreditTransaction).where(CreditTransaction.merchant_credit_order_id == mco_id)
        )
        return result.scalars().all()

    async def update_status(self, transaction: CreditTransaction, status: CreditTransactionStatus):
        transaction.status = status
        await self.db.commit()
        await self.db.refresh(transaction)

    async def create_order_processing_fee(
        self,
        business_id: uuid.UUID,
        order_id: uuid.UUID,
        order_number: str,
        fee: float,
    ) -> CreditTransaction:
        """Create a credit transaction for order processing fee and update balance."""
        from app.repositories.business_repository import BusinessRepository

        # Create the transaction
        transaction = await self.create({
            "business_id": business_id,
            "order_id": order_id,
            "type": CreditTransactionType.order_processing_fee,
            "status": CreditTransactionStatus.completed,
            "amount": fee,
            "direction": CreditTransactionDirection.DEBIT,
            "reference": order_number,
            "description": f"Processing fee for order {order_number}",
        })

        # Update business credit balance
        business_repo = BusinessRepository(self.db)
        business = await business_repo.get_by_id(business_id)
        if business:
            business.credit_balance -= Decimal(fee)
            await self.db.commit()
            await self.db.refresh(business)

        return transaction
