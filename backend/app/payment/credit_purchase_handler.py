from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.merchant_credit_order import MerchantCreditOrder, MerchantCreditOrderStatus
from app.models.credit_transaction import CreditTransactionType, CreditTransactionDirection, CreditTransactionStatus
from app.repositories.merchant_credit_order_repository import MerchantCreditOrderRepository
from app.repositories.credit_transaction_repository import CreditTransactionRepository
from app.repositories.business_repository import BusinessRepository
import uuid
from app.models.credit_allocation import CreditAllocation

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

        # Lock the merchant credit order row for update to protect against concurrent completion
        from sqlalchemy import select
        result = await self.db.execute(
            select(MerchantCreditOrder).where(MerchantCreditOrder.id == merchant_credit_order_id).with_for_update()
        )
        order = result.scalar_one_or_none()
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

            # Create CreditAllocation for this purchase
            from datetime import datetime, timedelta
            allocation = CreditAllocation(
                business_id=order.business_id,
                merchant_credit_order_id=order.id,
                credit_plan_id=order.credit_plan_id,
                type="paid",
                original_credit=order.credit_received,
                remaining_credit=order.credit_received,
                original_volume=plan.credit_volume if plan else 0,
                remaining_volume=plan.credit_volume if plan else 0,
                granted_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=30),
            )
            self.db.add(allocation)

            await self.db.commit()
            await self.db.refresh(business)

        business_summary = None
        if business:
            business_summary = {
                "id": str(business.id),
                "name": business.name,
                "credit_balance": float(business.credit_balance),
                "remaining_credit_volume": float(business.remaining_credit_volume),
            }
        return {
            "status": "completed",
            "order_id": str(order.id),
            "business": business_summary,
        }
