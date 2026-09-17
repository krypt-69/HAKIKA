"""P3 — Settlement retry / attempt_payout tests.

Per-test engine to avoid event-loop mismatch.
"""
import asyncio
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, patch

import app.models  # noqa: F401
import app.models.product_category  # noqa: F401

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

from app.models.user import User
from app.models.business import Business, PaymentModel
from app.models.customer import Customer
from app.models.payment_method import PaymentMethod, PaymentMethodType
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.settlement import Settlement, SettlementStatus
from app.repositories.settlement_repository import SettlementRepository
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.services.settlement_service import SettlementService
from app.payment.providers.intasend import IntaSendProvider


def _fresh_session_maker():
    eng = create_async_engine(settings.database_url, echo=False)
    return eng, async_sessionmaker(eng, class_=AsyncSession, expire_on_commit=False)


async def _fixture(db, suffix, amount, status=SettlementStatus.pending, with_pm=True):
    owner = User(email=f"p3-{suffix}@test.com", password_hash="x", role="owner")
    db.add(owner); await db.flush()
    business = Business(
        owner_id=owner.id, name=f"P3 {suffix}", category_id=1,
        slug=f"p3-{suffix}", payment_model=PaymentModel.pay_as_you_go, is_active=True,
    )
    db.add(business); await db.flush()
    if with_pm:
        pm = PaymentMethod(
            business_id=business.id, type=PaymentMethodType.till,
            encrypted_account_number="1715841", last_four_digits="5841", is_active=True,
        )
        db.add(pm); await db.flush()
    customer = Customer(phone_original="+254700000001",
                         phone_normalized=f"+2547{suffix[:7]}")
    db.add(customer); await db.flush()
    order = Order(
        order_number=f"P3{suffix.upper()}",
        customer_id=customer.id, business_id=business.id,
        status=OrderStatus.paid, subtotal=amount, delivery_fee=0,
        total_amount=amount, status_version=2,
    )
    db.add(order); await db.flush()
    payment = Payment(
        order_id=order.id, idempotency_key=str(uuid.uuid4()), provider="intasend",
        amount=amount, payment_type=PaymentType.FINAL_PAYMENT,
        status=PaymentStatus.verified,
    )
    db.add(payment); await db.flush()
    settlement = Settlement(
        business_id=business.id, order_id=order.id, payment_id=payment.id,
        amount=amount, status=status,
        payout_reference=f"STL-{uuid.uuid4().hex[:20]}",
        next_retry_at=datetime.utcnow(),
    )
    db.add(settlement); await db.flush()
    await db.commit()
    return business, settlement


def _service(db):
    return SettlementService(
        SettlementRepository(db), LedgerRepository(db),
        BusinessRepository(db), PaymentMethodRepository(db),
    )


def test_pending_sufficient_balance_marks_processing():
    async def run():
        eng, Session = _fresh_session_maker()
        try:
            async with Session() as db:
                _, s = await _fixture(db, uuid.uuid4().hex[:8], amount=3.0)
                sid = s.id
                with patch.object(IntaSendProvider, "get_wallet_balance",
                                  new=AsyncMock(return_value={"available_balance": 100.0})), \
                     patch.object(IntaSendProvider, "initiate_payout",
                                  new=AsyncMock(return_value={"tracking_id": "TRACK-123"})):
                    result = await _service(db).attempt_payout(sid)
                assert result["status"] == "processing"
                db.expire_all()
                s2 = (await db.execute(select(Settlement).where(Settlement.id == sid))).scalar_one()
                assert s2.status == SettlementStatus.processing
                assert s2.provider_payout_reference == "TRACK-123"
                assert s2.submitted_at is not None
                print("PASS 1: sufficient balance -> processing")
        finally:
            await eng.dispose()
    asyncio.run(run())


def test_pending_insufficient_balance_marks_waiting():
    async def run():
        eng, Session = _fresh_session_maker()
        try:
            async with Session() as db:
                _, s = await _fixture(db, uuid.uuid4().hex[:8], amount=10.0)
                sid = s.id
                with patch.object(IntaSendProvider, "get_wallet_balance",
                                  new=AsyncMock(return_value={"available_balance": 1.0})):
                    result = await _service(db).attempt_payout(sid)
                assert result["status"] == "waiting_for_funds"
                assert result["reason"] == "insufficient_available_funds"
                db.expire_all()
                s2 = (await db.execute(select(Settlement).where(Settlement.id == sid))).scalar_one()
                assert s2.status == SettlementStatus.waiting_for_funds
                assert s2.submitted_at is None
                assert s2.failure_reason == "insufficient_available_funds"
                assert s2.first_waiting_at is not None
                print("PASS 2: insufficient balance -> waiting_for_funds")
        finally:
            await eng.dispose()
    asyncio.run(run())


def test_balance_check_failure_marks_waiting():
    async def run():
        eng, Session = _fresh_session_maker()
        try:
            async with Session() as db:
                _, s = await _fixture(db, uuid.uuid4().hex[:8], amount=3.0)
                sid = s.id
                with patch.object(IntaSendProvider, "get_wallet_balance",
                                  new=AsyncMock(side_effect=Exception("network down"))):
                    result = await _service(db).attempt_payout(sid)
                assert result["status"] == "waiting_for_funds"
                assert result["reason"] == "balance_check_failed"
                db.expire_all()
                s2 = (await db.execute(select(Settlement).where(Settlement.id == sid))).scalar_one()
                assert s2.failure_reason == "balance_check_failed"
                assert s2.submitted_at is None
                print("PASS 3: balance check failure -> waiting_for_funds")
        finally:
            await eng.dispose()
    asyncio.run(run())


def test_no_active_payment_method_marks_failed_no_quarantine():
    async def run():
        eng, Session = _fresh_session_maker()
        try:
            async with Session() as db:
                _, s = await _fixture(db, uuid.uuid4().hex[:8], amount=3.0, with_pm=False)
                sid = s.id
                with patch.object(IntaSendProvider, "get_wallet_balance",
                                  new=AsyncMock(return_value={"available_balance": 100.0})):
                    result = await _service(db).attempt_payout(sid)
                assert result["status"] == "failed"
                assert result["reason"] == "no_active_payment_method"
                db.expire_all()
                s2 = (await db.execute(select(Settlement).where(Settlement.id == sid))).scalar_one()
                assert s2.status == SettlementStatus.failed
                assert s2.failure_reason == "no_active_payment_method"
                assert s2.submitted_at is None
                print("PASS 4: no payment method -> failed, submitted_at NULL")
        finally:
            await eng.dispose()
    asyncio.run(run())


def test_network_error_after_submission_is_quarantined():
    async def run():
        eng, Session = _fresh_session_maker()
        try:
            async with Session() as db:
                _, s = await _fixture(db, uuid.uuid4().hex[:8], amount=3.0)
                sid = s.id
                with patch.object(IntaSendProvider, "get_wallet_balance",
                                  new=AsyncMock(return_value={"available_balance": 100.0})), \
                     patch.object(IntaSendProvider, "initiate_payout",
                                  new=AsyncMock(side_effect=Exception("connection reset"))):
                    result = await _service(db).attempt_payout(sid)
                assert result["status"] == "quarantined"
                assert result["reason"] == "unknown_submission_state"
                db.expire_all()
                s2 = (await db.execute(select(Settlement).where(Settlement.id == sid))).scalar_one()
                assert s2.status == SettlementStatus.failed
                assert s2.failure_reason == "unknown_submission_state"
                assert s2.submitted_at is not None
                assert s2.provider_payout_reference is None
                print("PASS 5: network error after submission -> quarantined")
        finally:
            await eng.dispose()
    asyncio.run(run())


def test_2xx_without_tracking_id_is_quarantined():
    async def run():
        eng, Session = _fresh_session_maker()
        try:
            async with Session() as db:
                _, s = await _fixture(db, uuid.uuid4().hex[:8], amount=3.0)
                sid = s.id
                with patch.object(IntaSendProvider, "get_wallet_balance",
                                  new=AsyncMock(return_value={"available_balance": 100.0})), \
                     patch.object(IntaSendProvider, "initiate_payout",
                                  new=AsyncMock(return_value={})):
                    result = await _service(db).attempt_payout(sid)
                assert result["status"] == "quarantined"
                db.expire_all()
                s2 = (await db.execute(select(Settlement).where(Settlement.id == sid))).scalar_one()
                assert s2.failure_reason == "unknown_submission_state"
                assert s2.submitted_at is not None
                print("PASS 6: 2xx without tracking_id -> quarantined")
        finally:
            await eng.dispose()
    asyncio.run(run())


def test_already_submitted_is_skipped():
    async def run():
        eng, Session = _fresh_session_maker()
        try:
            async with Session() as db:
                _, s = await _fixture(db, uuid.uuid4().hex[:8], amount=3.0)
                s.submitted_at = datetime.utcnow()
                await db.commit()
                sid = s.id
                with patch.object(IntaSendProvider, "get_wallet_balance",
                                  new=AsyncMock(return_value={"available_balance": 100.0})) as mock_check:
                    result = await _service(db).attempt_payout(sid)
                assert result["status"] == "quarantined"
                mock_check.assert_not_called()
                print("PASS 7: already submitted -> quarantined, no re-attempt")
        finally:
            await eng.dispose()
    asyncio.run(run())
