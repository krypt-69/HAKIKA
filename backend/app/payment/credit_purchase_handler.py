from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.merchant_credit_order import MerchantCreditOrderStatus
from app.models.credit_transaction import CreditTransactionType, CreditTransactionDirection, CreditTransactionStatus
from app.repositories.merchant_credit_order_repository import MerchantCreditOrderRepository
from app.repositories.credit_transaction_repository import CreditTransactionRepository
from app.repositories.business_repository import BusinessRepository
import uuid

class CreditPurchaseHandler:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.mco_repo = MerchantCreditOrderRepository(db)
        self.ct_repo = CreditTransactionRepository(db)
        self.business_repo = BusinessRepository(db)

    async def create_pending_order(
        self,
        business_id: uuid.UUID,
        credit_plan_id: uuid.UUID,
        amount_paid: float,
        credit_received: float,
        payment_reference: str,
    ) -> tuple:
        # Create MerchantCreditOrder
        order = await self.mco_repo.create({
            "business_id": business_id,
            "credit_plan_id": credit_plan_id,
            "amount_paid": amount_paid,
            "credit_received": credit_received,
            "status": MerchantCreditOrderStatus.pending,
            "payment_reference": payment_reference,
            "initiated_at": datetime.utcnow(),
        })

        # Create CreditTransaction
        transaction = await self.ct_repo.create({
            "business_id": business_id,
            "merchant_credit_order_id": order.id,
            "type": CreditTransactionType.purchase,
            "status": CreditTransactionStatus.pending,
            "amount": credit_received,
            "direction": CreditTransactionDirection.CREDIT,
            "reference": payment_reference,
            "description": f"Credit purchase: {payment_reference}",
        })

        return order, transaction

    async def complete_purchase(
        self,
        merchant_credit_order_id: uuid.UUID,
        provider_reference: str,
    ) -> dict:
        # Fetch order
        order = await self.mco_repo.get_by_id(merchant_credit_order_id)
        if not order:
            return {"status": "not_found"}

        if order.status == MerchantCreditOrderStatus.completed:
            return {"status": "already_completed", "order": order}

        # Update order
        await self.mco_repo.update_status(order, MerchantCreditOrderStatus.completed, provider_reference)

        # Update transaction
        transactions = await self.ct_repo.get_by_merchant_credit_order_id(order.id)
        for tx in transactions:
            await self.ct_repo.update_status(tx, CreditTransactionStatus.completed)

        # Update business balance (cached)
        business = await self.business_repo.get_by_id(order.business_id)
        if business:
            business.credit_balance += order.credit_received
            # Add plan volume to business remaining volume
            from app.repositories.credit_plan_repository import CreditPlanRepository
            plan_repo = CreditPlanRepository(self.db)
            plan = await plan_repo.get_by_id(order.credit_plan_id)
            if plan and plan.credit_volume > 0:
                business.remaining_credit_volume += plan.credit_volume
            await self.db.commit()
            await self.db.refresh(business)

        return {"status": "completed", "order": order, "business": business}
