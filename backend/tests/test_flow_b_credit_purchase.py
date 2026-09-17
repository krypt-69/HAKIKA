"""
Flow B production-path tests — Business Buy Credit via PayHero.

These tests exercise the real HTTP endpoint /api/v1/credit/callback
against the running server, plus the real complete_purchase production
code path. They do NOT fake completion.

Setup strategy: create a pending MerchantCreditOrder in the DB with a
fresh CREDIT-XXXXXXXX reference so the callback can locate it. This is
test-fixture data — the actual completion happens through the production
code path when the callback is POSTed.

Requires:
  - running backend on http://localhost:8000
  - ngrok callback URL is not needed for these tests (we POST directly)
  - PAYHERO_COLLECTION_CHANNEL_ID configured in the running process
"""
import asyncio
import uuid

import httpx
import pytest

from app.database.session import async_session
from app.models.merchant_credit_order import (
    MerchantCreditOrder,
    MerchantCreditOrderStatus,
)


API = "http://localhost:8000/api/v1"


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


async def _pick_business_and_plan():
    from sqlalchemy import select
    from app.models.business import Business, PaymentModel
    from app.models.credit_plan import CreditPlan

    async with async_session() as db:
        result = await db.execute(
            select(Business).where(
                Business.payment_model == PaymentModel.credit,
                Business.is_active == True,
            ).limit(1)
        )
        business = result.scalar_one_or_none()
        result = await db.execute(
            select(CreditPlan).where(CreditPlan.active == True).limit(1)
        )
        plan = result.scalar_one_or_none()
        if not business or not plan:
            pytest.skip("No active credit business or credit plan available for tests")
        return str(business.id), str(plan.id)


async def _create_pending_order(ref: str, business_id: str, plan_id: str,
                                amount_paid: float = 1000.0,
                                credit_received: float = 10000.0,
                                provider_data: dict | None = None) -> str:
    async with async_session() as db:
        order = MerchantCreditOrder(
            business_id=uuid.UUID(business_id),
            credit_plan_id=uuid.UUID(plan_id),
            amount_paid=amount_paid,
            credit_received=credit_received,
            status=MerchantCreditOrderStatus.pending,
            payment_reference=ref,
            provider_data=provider_data,
        )
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return str(order.id)


async def _fetch_order(ref: str):
    from sqlalchemy import select
    async with async_session() as db:
        result = await db.execute(
            select(MerchantCreditOrder).where(MerchantCreditOrder.payment_reference == ref)
        )
        return result.scalar_one_or_none()


def _make_real_payhero_payload(external_reference: str,
                               amount: float = 1000.0,
                               channel_id: int = 12756,
                               phone: str = "254715982985",
                               checkout_id: str = None,
                               result_code: int = 0,
                               status_str: str = "Success",
                               top_status: bool = True) -> dict:
    return {
        "status": top_status,
        "response": {
            "MerchantRequestID": checkout_id or f"mr-{uuid.uuid4().hex[:8]}",
            "CheckoutRequestID": checkout_id or f"ws_CO_{uuid.uuid4().hex[:16]}",
            "ResultCode": result_code,
            "Amount": amount,
            "MpesaReceiptNumber": "UIFTESTRECEIPT",
            "Phone": phone,
            "ExternalReference": external_reference,
            "Status": status_str,
            "ResultDesc": "test",
            "ChannelID": channel_id,
            "Fee": 0.0,
        },
        "forward_url": "",
    }


# ---------------------------------------------------------------------
# HTTP behaviour — malformed and unknown cases
# ---------------------------------------------------------------------

def test_credit_callback_empty_payload_returns_422():
    with httpx.Client(timeout=10) as c:
        r = c.post(f"{API}/credit/callback", json={})
    assert r.status_code == 422


def test_credit_callback_missing_api_ref_returns_400():
    with httpx.Client(timeout=10) as c:
        r = c.post(f"{API}/credit/callback", json={"state": "COMPLETE"})
    assert r.status_code == 400


def test_credit_callback_unknown_reference_returns_404():
    payload = _make_real_payhero_payload(
        external_reference=f"CREDIT-UNKNOWN-{uuid.uuid4().hex[:8]}"
    )
    with httpx.Client(timeout=10) as c:
        r = c.post(f"{API}/credit/callback", json=payload)
    assert r.status_code == 404


def test_credit_callback_internal_shape_missing_api_ref_returns_400():
    with httpx.Client(timeout=10) as c:
        r = c.post(f"{API}/credit/callback", json={"api_ref": None, "state": "COMPLETE"})
    assert r.status_code == 400


# ---------------------------------------------------------------------
# Validation — with a real pending MerchantCreditOrder
# ---------------------------------------------------------------------

def test_credit_callback_amount_mismatch_returns_422():
    biz, plan = _run(_pick_business_and_plan())
    ref = f"CREDIT-TEST-{uuid.uuid4().hex[:8]}"
    _run(_create_pending_order(ref, biz, plan, amount_paid=1000.0))
    payload = _make_real_payhero_payload(external_reference=ref, amount=999.0)
    with httpx.Client(timeout=10) as c:
        r = c.post(f"{API}/credit/callback", json=payload)
    assert r.status_code == 422
    order = _run(_fetch_order(ref))
    assert order.status == MerchantCreditOrderStatus.pending


def test_credit_callback_channel_mismatch_returns_422():
    biz, plan = _run(_pick_business_and_plan())
    ref = f"CREDIT-TEST-{uuid.uuid4().hex[:8]}"
    _run(_create_pending_order(ref, biz, plan, amount_paid=1000.0))
    payload = _make_real_payhero_payload(external_reference=ref, amount=1000.0, channel_id=99999)
    with httpx.Client(timeout=10) as c:
        r = c.post(f"{API}/credit/callback", json=payload)
    assert r.status_code == 422
    order = _run(_fetch_order(ref))
    assert order.status == MerchantCreditOrderStatus.pending


# ---------------------------------------------------------------------
# Successful completion + idempotency
# ---------------------------------------------------------------------

def test_credit_callback_success_completes_purchase():
    biz, plan = _run(_pick_business_and_plan())
    ref = f"CREDIT-TEST-{uuid.uuid4().hex[:8]}"
    _run(_create_pending_order(ref, biz, plan, amount_paid=1000.0, credit_received=10000.0))
    payload = _make_real_payhero_payload(external_reference=ref, amount=1000.0)
    with httpx.Client(timeout=15) as c:
        r = c.post(f"{API}/credit/callback", json=payload)
    assert r.status_code == 200
    order = _run(_fetch_order(ref))
    assert order.status == MerchantCreditOrderStatus.completed
    assert order.completed_at is not None


def test_credit_callback_replay_is_idempotent():
    biz, plan = _run(_pick_business_and_plan())
    ref = f"CREDIT-TEST-{uuid.uuid4().hex[:8]}"
    _run(_create_pending_order(ref, biz, plan, amount_paid=1000.0, credit_received=10000.0))
    payload = _make_real_payhero_payload(external_reference=ref, amount=1000.0)

    with httpx.Client(timeout=15) as c:
        r1 = c.post(f"{API}/credit/callback", json=payload)
        r2 = c.post(f"{API}/credit/callback", json=payload)

    assert r1.status_code == 200
    assert r2.status_code == 200

    order = _run(_fetch_order(ref))
    assert order.status == MerchantCreditOrderStatus.completed


def test_credit_callback_provider_data_checkout_id_match():
    biz, plan = _run(_pick_business_and_plan())
    ref = f"CREDIT-TEST-{uuid.uuid4().hex[:8]}"
    checkout = f"ws_CO_{uuid.uuid4().hex[:16]}"
    _run(_create_pending_order(
        ref, biz, plan, amount_paid=1000.0,
        provider_data={"checkout_request_id": checkout},
    ))
    payload = _make_real_payhero_payload(
        external_reference=ref, amount=1000.0, checkout_id=checkout
    )
    with httpx.Client(timeout=15) as c:
        r = c.post(f"{API}/credit/callback", json=payload)
    assert r.status_code == 200


def test_credit_callback_provider_data_checkout_id_mismatch_returns_422():
    biz, plan = _run(_pick_business_and_plan())
    ref = f"CREDIT-TEST-{uuid.uuid4().hex[:8]}"
    _run(_create_pending_order(
        ref, biz, plan, amount_paid=1000.0,
        provider_data={"checkout_request_id": "ws_CO_STORED"},
    ))
    payload = _make_real_payhero_payload(
        external_reference=ref, amount=1000.0, checkout_id="ws_CO_DIFFERENT"
    )
    with httpx.Client(timeout=15) as c:
        r = c.post(f"{API}/credit/callback", json=payload)
    assert r.status_code == 422

# ---------------------------------------------------------------------
# BUG-B1 regression: callback response must not fail serialization when
# the business has non-UTF-8 LargeBinary data in logo_data / cover_data
# ---------------------------------------------------------------------

def test_credit_callback_succeeds_when_business_has_binary_logo_data():
    """Regression for BUG-B1: business with binary logo/cover must not crash response encoding."""
    import asyncio
    import uuid as _uuid
    from sqlalchemy import select
    from app.database.session import async_session
    from app.models.business import Business, PaymentModel
    from app.models.category import Category
    from app.models.credit_plan import CreditPlan

    async def _setup():
        async with async_session() as db:
            # Category — take any existing
            cat_res = await db.execute(select(Category).limit(1))
            cat = cat_res.scalar_one_or_none()
            if cat is None:
                pytest.skip("No category available for test fixture")

            # Credit plan — take any existing
            plan_res = await db.execute(select(CreditPlan).where(CreditPlan.active == True).limit(1))
            plan = plan_res.scalar_one_or_none()
            if plan is None:
                pytest.skip("No active credit plan available for test fixture")

            # Unique owner — reuse admin user as owner_id
            from app.models.user import User
            user_res = await db.execute(select(User).limit(1))
            user = user_res.scalar_one_or_none()
            if user is None:
                pytest.skip("No user available for test fixture")

            # Create a throwaway business with binary data in logo/cover
            biz = Business(
                owner_id=user.id,
                name=f"BUG-B1-{_uuid.uuid4().hex[:6]}",
                category_id=cat.id,
                slug=f"bug-b1-{_uuid.uuid4().hex[:8]}",
                payment_model=PaymentModel.credit,
                is_active=True,
                credit_balance=0,
                remaining_credit_volume=0,
                logo_data=b"\xa0\x01\x02",   # non-UTF-8 bytes — the exact case that crashed
                cover_data=b"\xa0\xff\xfe",
            )
            db.add(biz)
            await db.commit()
            await db.refresh(biz)
            return str(biz.id), str(plan.id)

    biz_id, plan_id = asyncio.get_event_loop().run_until_complete(_setup())
    ref = f"CREDIT-BUG-B1-{_uuid.uuid4().hex[:8]}"

    async def _create_order():
        async with async_session() as db:
            order = MerchantCreditOrder(
                business_id=_uuid.UUID(biz_id),
                credit_plan_id=_uuid.UUID(plan_id),
                amount_paid=1000.0,
                credit_received=10000.0,
                status=MerchantCreditOrderStatus.pending,
                payment_reference=ref,
            )
            db.add(order)
            await db.commit()
    asyncio.get_event_loop().run_until_complete(_create_order())

    payload = _make_real_payhero_payload(external_reference=ref, amount=1000.0)
    with httpx.Client(timeout=15) as c:
        r = c.post(f"{API}/credit/callback", json=payload)

    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body.get("status") == "completed"
    assert body.get("business", {}).get("id") == biz_id
    # Confirm no ORM leakage (no bytes, no SQLAlchemy markers)
    assert isinstance(body["business"], dict)
