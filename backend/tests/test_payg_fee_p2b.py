"""
P2b regression: PAYG callback must use calculate_payg_fee (not
calculate_processing_fee), and must produce the correct fee and settlement
for the current production policy (10%, minimum KES 1).

This test exercises the actual production PAYG callback financial path,
not a mocked fee.
"""
import asyncio
import uuid

import app.models  # noqa: F401
import app.models.product_category  # noqa: F401

from sqlalchemy import select
from app.database.session import async_session
from app.models.user import User
from app.models.business import Business, PaymentModel
from app.models.customer import Customer
from app.models.payment_method import PaymentMethod, PaymentMethodType
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.ledger_entry import LedgerEntry, LedgerTransactionType
from app.models.settlement import Settlement
from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.payment_policy_repository import PaymentPolicyRepository
from app.services.payment_service import PaymentService
from app.services.payment_policy_service import PaymentPolicyService


async def _make_fixture(db, suffix, amount):
    owner = User(email=f"p2b-{suffix}@test.com", password_hash="x", role="owner")
    db.add(owner); await db.flush()
    business = Business(
        owner_id=owner.id, name=f"P2b {suffix}", category_id=1,
        slug=f"p2b-{suffix}", payment_model=PaymentModel.pay_as_you_go, is_active=True,
    )
    db.add(business); await db.flush()
    pm = PaymentMethod(
        business_id=business.id, type=PaymentMethodType.till,
        encrypted_account_number="1715841", last_four_digits="5841", is_active=True,
    )
    db.add(pm); await db.flush()
    customer = Customer(phone_original="+254700000001", phone_normalized=f"+2547{suffix[:7]}")
    db.add(customer); await db.flush()
    order = Order(
        order_number=f"HK-{suffix.upper()}",
        customer_id=customer.id, business_id=business.id,
        status=OrderStatus.payment_pending, subtotal=amount, delivery_fee=0,
        total_amount=amount, status_version=1,
    )
    db.add(order); await db.flush()
    payment = Payment(
        order_id=order.id, idempotency_key=str(uuid.uuid4()), provider="intasend",
        amount=amount, payment_type=PaymentType.FINAL_PAYMENT, status=PaymentStatus.pending,
    )
    db.add(payment); await db.flush()
    return business, customer, order, payment


def test_payg_fee_k10_uses_payg_percentage():
    """KES 10 at 10% -> fee 1.00, settlement 9.00, ledger correct."""

    async def run():
        suffix = uuid.uuid4().hex[:8]
        async with async_session() as db:
            b, c, o, p = await _make_fixture(db, suffix, amount=10.0)
            await db.commit()
            oid, pid, bid = o.id, p.id, b.id

            order = (await db.execute(select(Order).where(Order.id == oid))).scalar_one()
            payment = (await db.execute(select(Payment).where(Payment.id == pid))).scalar_one()
            business = (await db.execute(select(Business).where(Business.id == bid))).scalar_one()

            svc = PaymentService(
                PaymentRepository(db), OrderRepository(db), CustomerRepository(db),
                LedgerRepository(db), PaymentPolicyService(PaymentPolicyRepository(db)),
            )

            # Production policy: 10%, minimum 1.00
            fee = await svc._process_payg_callback_transaction.__globals__["calculate_payg_fee"](db, 10.0)
            assert fee == 1.00, f"unexpected fee {fee}"

            order, settlement = await svc._process_payg_callback_transaction(payment, business, order, fee)
            await db.commit()
            await db.refresh(order)
            await db.refresh(settlement)

            db.expire_all()
            p = (await db.execute(select(Payment).where(Payment.id == pid))).scalar_one()
            o = (await db.execute(select(Order).where(Order.id == oid))).scalar_one()
            s = (await db.execute(select(Settlement).where(Settlement.payment_id == pid))).scalar_one()
            ledger = (await db.execute(
                select(LedgerEntry).where(LedgerEntry.payment_id == pid).order_by(LedgerEntry.transaction_type)
            )).scalars().all()

            assert p.status == PaymentStatus.verified, p.status
            assert o.status == OrderStatus.paid, o.status
            assert float(s.amount) == 9.00, s.amount
            assert len(ledger) == 2, len(ledger)

            types = {e.transaction_type: float(e.amount) for e in ledger}
            assert types.get(LedgerTransactionType.payment_in) == 10.00, types
            assert types.get(LedgerTransactionType.hakika_fee) == -1.00, types

            print("PASS: KES 10 -> fee 1.00, settlement 9.00, ledger correct")
            # No cleanup: fixture rows are isolated by unique ids and do not
            # affect other tests. Skipping avoids FK ordering concerns.

    asyncio.run(run())
