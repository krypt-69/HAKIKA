"""P3 — IntaSend B2B payout callback endpoint tests."""
import asyncio
import uuid

import app.models  # noqa: F401
import app.models.product_category  # noqa: F401

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.models.user import User
from app.models.business import Business, PaymentModel
from app.models.settlement import Settlement, SettlementStatus


BASE = "http://localhost:8000"
CHALLENGE = settings.intasend_challenge


def _fresh_session_maker():
    eng = create_async_engine(settings.database_url, echo=False)
    return eng, async_sessionmaker(eng, class_=AsyncSession, expire_on_commit=False)


def _make_settlement_sync(tracking_id, status=SettlementStatus.processing, payout_ref=None):
    async def run():
        eng, Session = _fresh_session_maker()
        try:
            async with Session() as db:
                suffix = uuid.uuid4().hex[:8]
                owner = User(email=f"p3cb-{suffix}@test.com", password_hash="x", role="owner")
                db.add(owner); await db.flush()
                business = Business(
                    owner_id=owner.id, name=f"P3cb {suffix}", category_id=1,
                    slug=f"p3cb-{suffix}", payment_model=PaymentModel.pay_as_you_go, is_active=True,
                )
                db.add(business); await db.flush()
                pref = payout_ref or f"STL-{uuid.uuid4().hex[:20]}"
                s = Settlement(
                    business_id=business.id,
                    amount=2.0, status=status,
                    payout_reference=pref,
                    provider_payout_reference=tracking_id,
                )
                db.add(s); await db.flush()
                await db.commit()
                return s.id, pref
        finally:
            await eng.dispose()
    return asyncio.run(run())


def _fetch_status(settlement_id):
    async def run():
        eng, Session = _fresh_session_maker()
        try:
            async with Session() as db:
                s = (await db.execute(
                    select(Settlement).where(Settlement.id == settlement_id)
                )).scalar_one()
                return s.status.value, s.failure_reason
        finally:
            await eng.dispose()
    return asyncio.run(run())


def test_callback_missing_challenge_rejected():
    r = httpx.post(f"{BASE}/api/v1/payments/intasend/payout-callback",
                   json={"tracking_id": "X"})
    assert r.status_code == 401
    print("PASS: missing challenge -> 401")


def test_callback_wrong_challenge_rejected():
    r = httpx.post(f"{BASE}/api/v1/payments/intasend/payout-callback",
                   json={"tracking_id": "X", "challenge": "wrong"})
    assert r.status_code == 401
    print("PASS: wrong challenge -> 401")


def test_callback_ts100_marks_completed():
    trk = f"TRK-COMPLETE-{uuid.uuid4().hex[:8]}"
    sid, _ = _make_settlement_sync(trk, status=SettlementStatus.processing)
    r = httpx.post(f"{BASE}/api/v1/payments/intasend/payout-callback",
                   json={"tracking_id": trk,
                         "transactions": [{"status_code": "TS100"}],
                         "challenge": CHALLENGE})
    assert r.status_code == 200
    status, reason = _fetch_status(sid)
    assert status == "completed"
    print("PASS: TS100 -> completed")


def test_callback_tf106_marks_failed():
    trk = f"TRK-FAIL-{uuid.uuid4().hex[:8]}"
    sid, _ = _make_settlement_sync(trk, status=SettlementStatus.processing)
    r = httpx.post(f"{BASE}/api/v1/payments/intasend/payout-callback",
                   json={"tracking_id": trk,
                         "transactions": [{"status_code": "TF106"}],
                         "challenge": CHALLENGE})
    assert r.status_code == 200
    status, reason = _fetch_status(sid)
    assert status == "failed"
    assert reason and "TF106" in reason
    print("PASS: TF106 -> failed")


def test_callback_tf105_leaves_processing():
    trk = f"TRK-PENDING-{uuid.uuid4().hex[:8]}"
    sid, _ = _make_settlement_sync(trk, status=SettlementStatus.processing)
    r = httpx.post(f"{BASE}/api/v1/payments/intasend/payout-callback",
                   json={"tracking_id": trk,
                         "transactions": [{"status_code": "TF105"}],
                         "challenge": CHALLENGE})
    assert r.status_code == 200
    status, _ = _fetch_status(sid)
    assert status == "processing"
    print("PASS: TF105 -> still processing")


def test_callback_unknown_tracking_id_returns_200():
    r = httpx.post(f"{BASE}/api/v1/payments/intasend/payout-callback",
                   json={"tracking_id": f"NONEXISTENT-{uuid.uuid4().hex[:8]}",
                         "transactions": [{"status_code": "TS100"}],
                         "challenge": CHALLENGE})
    assert r.status_code == 200
    print("PASS: unknown tracking_id -> 200 with no_match")
