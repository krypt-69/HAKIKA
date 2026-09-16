"""
P2 atomicity tests for the PAYG callback path.

Uses pytest-asyncio so the test loop matches the module-level async engine.
"""
import uuid

import pytest
from sqlalchemy import select

from app.database.session import async_session
from app.models.business import Business, PaymentModel
from app.models.customer import Customer
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.payment_method import PaymentMethod, PaymentMethodType
from app.models.product import Product
from app.models.user import User
from app.models.ledger_entry import LedgerEntry
from app.models.settlement import Settlement
from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.payment_policy_repository import PaymentPolicyRepository
from app.services.payment_service import PaymentService
from app.services.payment_policy_service import PaymentPolicyService


async def _make_payg_fixture(db):
    suffix = uuid.uuid4().hex[:8]

    owner = User(
        email=f"atomic-owner-{suffix}@test.com",
        password_hash="x",
        role="owner",
    )
    db.add(owner)
    await db.flush()

    business = Business(
        owner_id=owner.id,
        name=f"Atomic Store {suffix}",
        category_id=1,
        slug=f"atomic-{suffix}",
        payment_model=PaymentModel.pay_as_you_go,
        is_active=True,
    )
    db.add(business)
    await db.flush()

    pm = PaymentMethod(
        business_id=business.id,
        type=PaymentMethodType.till,
        encrypted_account_number="1715841",
        last_four_digits="5841",
        is_active=True,
    )
    db.add(pm)
    await db.flush()

    customer = Customer(
        phone_original="+254700000001",
        phone_normalized=f"+25470000{suffix[:4]}",
    )
    db.add(customer)
    await db.flush()

    product = Product(
        business_id=business.id,
        name="Atomic Item",
        original_price=100,
        is_available=True,
    )
    db.add(product)
    await db.flush()

    order = Order(
        customer_id=customer.id,
        business_id=business.id,
        status=OrderStatus.payment_pending,
        subtotal=100,
        delivery_fee=0,
        total_amount=100,
        status_version=1,
    )
    db.add(order)
    await db.flush()

    payment = Payment(
        order_id=order.id,
        idempotency_key=str(uuid.uuid4()),
        provider="intasend",
        amount=100,
        payment_type=PaymentType.FINAL_PAYMENT,
        status=PaymentStatus.pending,
    )
    db.add(payment)
    await db.flush()

    return business, customer, order, payment


async def _run_callback(db, order, payment, fee=9.0):
    payment_repo = PaymentRepository(db)
    order_repo = OrderRepository(db)
    customer_repo = CustomerRepository(db)
    ledger_repo = LedgerRepository(db)
    policy_repo = PaymentPolicyRepository(db)
    policy_service = PaymentPolicyService(policy_repo)
    svc = PaymentService(payment_repo, order_repo, customer_repo, ledger_repo, policy_service)

    biz = (await db.execute(
        select(Business).where(Business.id == order.business_id)
    )).scalar_one()

    return await svc._process_payg_callback_transaction(payment, biz, order, fee)


@pytest.mark.asyncio
async def test_payg_single_commit_persists_all():
    async with async_session() as db:
        business, customer, order, payment = await _make_payg_fixture(db)
        await db.commit()

        order_id = order.id
        payment_id = payment.id
        business_id = business.id
        customer_id = customer.id

        order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one()
        payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one()

        result = await _run_callback(db, order, payment, fee=9.0)
        assert isinstance(result, tuple) and len(result) == 2
        _, settlement = result

        # SINGLE COMMIT
        await db.commit()

        db.expire_all()
        p = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one()
        o = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one()
        s = (await db.execute(select(Settlement).where(Settlement.payment_id == payment_id))).scalar_one()
        ledger_rows = (await db.execute(select(LedgerEntry).where(LedgerEntry.payment_id == payment_id))).scalars().all()

        assert p.status == PaymentStatus.verified
        assert o.status == OrderStatus.paid
        assert float(s.amount) == 91.0
        assert len(ledger_rows) == 2

        # Cleanup
        for entry in ledger_rows:
            await db.delete(entry)
        await db.delete(s)
        await db.delete(p)
        await db.delete(o)
        await db.delete(customer)
        await db.delete(business)
        await db.commit()


@pytest.mark.asyncio
async def test_payg_atomic_rollback_when_settlement_fails(monkeypatch):
    async with async_session() as db:
        business, customer, order, payment = await _make_payg_fixture(db)
        await db.commit()

        order_id = order.id
        payment_id = payment.id
        business_id = business.id
        customer_id = customer.id

        order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one()
        payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one()

        from app.repositories import settlement_repository as sr_module

        async def _boom(*args, **kwargs):
            raise RuntimeError("simulated settlement failure")

        monkeypatch.setattr(sr_module.SettlementRepository, "add_noncommit", _boom)

        with pytest.raises(RuntimeError):
            await _run_callback(db, order, payment, fee=9.0)

        # Rollback the pending transaction — do NOT commit
        await db.rollback()

        db.expire_all()
        p = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one()
        o = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one()
        s = (await db.execute(select(Settlement).where(Settlement.payment_id == payment_id))).scalar_one_or_none()
        ledger_rows = (await db.execute(select(LedgerEntry).where(LedgerEntry.payment_id == payment_id))).scalars().all()

        assert p.status == PaymentStatus.pending
        assert o.status == OrderStatus.payment_pending
        assert s is None
        assert len(ledger_rows) == 0

        # Cleanup
        await db.delete(p)
        await db.delete(o)
        await db.delete(customer)
        await db.delete(business)
        await db.commit()
