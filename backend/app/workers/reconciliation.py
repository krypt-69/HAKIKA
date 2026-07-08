import asyncio
import logging
from app.services.payment_service import PaymentService
from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.database.session import get_db

logger = logging.getLogger("hakika.reconciliation")

async def reconcile_loop():
    """Background loop to reconcile pending settlements every 5 minutes."""
    while True:
        try:
            async for db in get_db():
                payment_repo = PaymentRepository(db)
                order_repo = OrderRepository(db)
                customer_repo = CustomerRepository(db)
                ledger_repo = LedgerRepository(db)
                service = PaymentService(payment_repo, order_repo, customer_repo, ledger_repo)
                result = await service.reconcile_pending()
                if result:
                    logger.info(f"Reconciliation completed: {result}")
                await asyncio.sleep(300)  # 5 minutes
        except Exception as e:
            logger.error(f"Reconciliation loop error: {e}")
            await asyncio.sleep(60)
