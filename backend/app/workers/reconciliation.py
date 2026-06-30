import asyncio
from app.database.session import async_session
from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.services.payment_service import PaymentService

async def run_reconciliation():
    print("Running payment reconciliation...")
    async with async_session() as db:
        payment_repo = PaymentRepository(db)
        order_repo = OrderRepository(db)
        customer_repo = CustomerRepository(db)
        ledger_repo = LedgerRepository(db)
        service = PaymentService(payment_repo, order_repo, customer_repo, ledger_repo)
        results = await service.reconcile_pending()
        for r in results:
            print(f"  Payment {r['payment_id']}: {r.get('result', r.get('error'))}")
    print("Reconciliation complete.")
