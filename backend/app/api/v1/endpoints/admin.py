from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User, UserRole
from app.repositories.settlement_repository import SettlementRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.services.settlement_service import SettlementService
from app.services.trust_service import TrustService
from app.models.settlement import Settlement, SettlementStatus
from app.models.audit_log import AuditLog
from app.models.business import Business
from app.models.order import Order, OrderStatus
from app.models.dispute import Dispute
from app.repositories.order_repository import OrderRepository
from app.repositories.merchant_credit_order_repository import MerchantCreditOrderRepository
from app.models.merchant_credit_order import MerchantCreditOrder
from app.models.category import Category
from app.models.payment_policy import PaymentPolicy
from app.repositories.payment_policy_repository import PaymentPolicyRepository
from app.models.credit_plan import CreditPlan
from app.repositories.credit_plan_repository import CreditPlanRepository

import uuid
from sqlalchemy import func, select

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(user: User = Depends(get_current_user)):
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return user

@router.get("/settlements")
async def list_settlements(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    repo = SettlementRepository(db)
    settlements = await repo.get_pending()
    return [{"id": s.id, "business_id": s.business_id, "amount": float(s.amount),
             "status": s.status.value, "retry_count": s.retry_count} for s in settlements]

@router.post("/settlements/{id}/process")
async def process_settlement(
    id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    settlement_repo = SettlementRepository(db)
    ledger_repo = LedgerRepository(db)
    business_repo = BusinessRepository(db)
    payment_method_repo = PaymentMethodRepository(db)
    service = SettlementService(settlement_repo, ledger_repo, business_repo, payment_method_repo)
    return await service.process_settlement(uuid.UUID(id), admin.id)

@router.get("/disputes")
async def list_disputes(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    from app.models.order import Order
    from app.models.business import Business
    from app.models.customer import Customer
    result = await db.execute(
        select(Dispute, Order.order_number, Business.name, Customer.phone_normalized)
        .join(Order, Dispute.order_id == Order.id)
        .join(Business, Order.business_id == Business.id)
        .join(Customer, Dispute.customer_id == Customer.id)
        .order_by(Dispute.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": str(d.id),
            "order_id": str(d.order_id),
            "order_number": order_number,
            "business_name": business_name,
            "customer_phone": customer_phone,
            "reason": d.reason,
            "status": d.status.value,
            "resolution": d.status.value if d.status.value.startswith("resolved_") else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
        }
        for d, order_number, business_name, customer_phone in rows
    ]

@router.put("/disputes/{id}/resolve")
async def resolve_dispute(
    id: str,
    resolution: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(Dispute.__table__.select().where(Dispute.id == uuid.UUID(id)))
    dispute = result.first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    from app.models.dispute import DisputeStatus
    new_status = DisputeStatus.resolved_customer if resolution == "resolved_customer" else DisputeStatus.resolved_business
    await db.execute(
        Dispute.__table__.update().where(Dispute.id == uuid.UUID(id)).values(
            status=new_status,
            resolved_by=admin.id,
            resolved_at=datetime.utcnow()
        )
    )
    audit = AuditLog(
        table_name='disputes',
        record_id=uuid.UUID(id),
        action='ADMIN_RESOLVED_DISPUTE',
        changed_by=admin.id,
        new_values={"status": resolution}
    )
    db.add(audit)
    await db.commit()
    return {"status": resolution}

@router.put("/businesses/{business_id}/suspend")
async def suspend_business(
    business_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    repo = BusinessRepository(db)
    business = await repo.get_by_id(uuid.UUID(business_id))
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    await repo.soft_delete(business)
    audit = AuditLog(
        table_name='businesses',
        record_id=business.id,
        action='ADMIN_SUSPENDED_BUSINESS',
        changed_by=admin.id,
        new_values={"deleted_at": str(business.deleted_at)}
    )
    db.add(audit)
    await db.commit()
    return {"status": "suspended"}

@router.get("/stats")
async def admin_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    businesses_count = await db.scalar(select(func.count(Business.id)).where(Business.deleted_at == None))
    orders_count = await db.scalar(select(func.count(Order.id)))
    pending_settlements = await db.scalar(
        select(func.count(Settlement.id)).where(Settlement.status == SettlementStatus.pending)
    )
    open_disputes = await db.scalar(select(func.count(Dispute.id)))
    return {
        "businesses": businesses_count,
        "orders": orders_count,
        "pending_settlements": pending_settlements,
        "open_disputes": open_disputes,
    }

@router.get("/businesses")
async def list_businesses(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    result = await db.execute(
        select(Business)
        .where(Business.deleted_at == None)
        .offset(skip)
        .limit(limit)
        .order_by(Business.name)
    )
    businesses = result.scalars().all()
    return [
        {
            "id": str(b.id),
            "name": b.name,
            "payment_model": b.payment_model.value if b.payment_model else None,
            "credit_balance": float(b.credit_balance),
            "remaining_credit_volume": float(b.remaining_credit_volume),
            "collect_payment_before_delivery": b.collect_payment_before_delivery,
            "is_active": b.is_active,
            "channel_id": b.channel_id,
        }
        for b in businesses
    ]

@router.get("/businesses/{business_id}")
async def get_business_detail(
    business_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    business = await db.get(Business, uuid.UUID(business_id))
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return {
        "id": str(business.id),
        "name": business.name,
        "slug": business.slug,
        "description": business.description,
        "category_id": business.category_id,
        "payment_model": business.payment_model.value if business.payment_model else None,
        "credit_balance": float(business.credit_balance),
        "remaining_credit_volume": float(business.remaining_credit_volume),
        "collect_payment_before_delivery": business.collect_payment_before_delivery,
        "is_active": business.is_active,
        "channel_id": business.channel_id,
        "channel_type": business.channel_type.value if business.channel_type else None,
        "channel_account": business.channel_account,
        "owner_id": str(business.owner_id),
        "trust_score": float(business.trust_score),
        "deleted_at": business.deleted_at.isoformat() if business.deleted_at else None,
    }

@router.put("/businesses/{business_id}/activate")
async def activate_business(
    business_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    business = await db.get(Business, uuid.UUID(business_id))
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    business.is_active = True
    business.deleted_at = None
    audit = AuditLog(
        table_name='businesses',
        record_id=business.id,
        action='ADMIN_ACTIVATED_BUSINESS',
        changed_by=admin.id,
        new_values={"is_active": True, "deleted_at": None},
    )
    db.add(audit)
    await db.commit()
    return {"status": "activated"}

@router.get("/businesses/{business_id}/orders")
async def list_business_orders(
    business_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    order_repo = OrderRepository(db)
    orders = await order_repo.list_by_business(uuid.UUID(business_id))
    return [
        {
            "id": str(o.id),
            "order_number": o.order_number,
            "status": o.status.value,
            "total_amount": float(o.total_amount),
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]

@router.get("/businesses/{business_id}/credit-orders")
async def list_credit_orders(
    business_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = MerchantCreditOrderRepository(db)
    orders = await repo.list_by_business(uuid.UUID(business_id))
    return [
        {
            "id": str(o.id),
            "amount_paid": float(o.amount_paid),
            "credit_received": float(o.credit_received),
            "status": o.status.value,
            "payment_reference": o.payment_reference,
            "created_at": o.initiated_at.isoformat() if o.initiated_at else None,
            "completed_at": o.completed_at.isoformat() if o.completed_at else None,
        }
        for o in orders
    ]

@router.get("/orders/{order_id}")
async def get_order_investigation(
    order_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Full order investigation view for admin."""
    # Fetch order
    result = await db.execute(select(Order).where(Order.id == uuid.UUID(order_id)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Customer
    from app.models.customer import Customer
    customer = await db.get(Customer, order.customer_id) if order.customer_id else None

    # Business
    business = await db.get(Business, order.business_id) if order.business_id else None

    # Rider (latest active assignment)
    from app.models.rider import Rider
    from app.models.delivery_assignment import DeliveryAssignment
    rider = None
    assignment = None
    assign_result = await db.execute(
        select(DeliveryAssignment)
        .where(DeliveryAssignment.order_id == order.id)
        .order_by(DeliveryAssignment.assigned_at.desc())
        .limit(1)
    )
    assignment = assign_result.scalar_one_or_none()
    if assignment:
        rider = await db.get(Rider, assignment.rider_id) if assignment.rider_id else None

    # Payment (latest FINAL_PAYMENT)
    from app.models.payment import Payment, PaymentType
    pay_result = await db.execute(
        select(Payment)
        .where(Payment.order_id == order.id, Payment.payment_type == PaymentType.FINAL_PAYMENT)
        .order_by(Payment.initiated_at.desc())
        .limit(1)
    )
    payment = pay_result.scalar_one_or_none()

    # Settlement
    settlement = None
    if payment:
        settle_result = await db.execute(
            select(Settlement).where(Settlement.payment_id == payment.id).limit(1)
        )
        settlement = settle_result.scalar_one_or_none()

    # Evidence (via delivery_attempts)
    from app.models.delivery_attempt import DeliveryAttempt
    from app.models.delivery_evidence import DeliveryEvidence
    evidence_list = []
    attempts_result = await db.execute(
        select(DeliveryAttempt).where(DeliveryAttempt.order_id == order.id)
    )
    attempts = attempts_result.scalars().all()
    for attempt in attempts:
        ev_result = await db.execute(
            select(DeliveryEvidence).where(DeliveryEvidence.delivery_attempt_id == attempt.id)
        )
        evs = ev_result.scalars().all()
        for ev in evs:
            evidence_list.append({
                "id": str(ev.id),
                "url": f"/api/v1/delivery/evidence/{ev.id}",
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
            })

    # Timeline (derived from timestamps)
    timeline = []
    def add_event(event, ts):
        if ts:
            timeline.append({"event": event, "at": ts.isoformat() if hasattr(ts, 'isoformat') else str(ts)})

    add_event("Order created", order.created_at)
    if payment:
        add_event("Payment pending", payment.initiated_at)
        add_event("Payment verified", payment.completed_at)
    if assignment:
        add_event("Rider assigned", assignment.assigned_at)
    add_event("Out for delivery", getattr(order, 'out_for_delivery_at', None))
    add_event("Arrived", getattr(order, 'arrived_at', None))
    add_event("Customer confirmed", getattr(order, 'customer_confirmed_at', None))
    if settlement:
        add_event("Settlement processed", settlement.created_at)
    add_event("Completed", getattr(order, 'completed_at', None))
    timeline.sort(key=lambda x: x["at"] if x["at"] else "")

    return {
        "order": {
            "id": str(order.id),
            "order_number": order.order_number,
            "status": order.status.value,
            "subtotal": float(order.subtotal),
            "delivery_fee": float(order.delivery_fee),
            "total_amount": float(order.total_amount),
            "created_at": order.created_at.isoformat() if order.created_at else None,
        },
        "customer": {
            "id": str(customer.id) if customer else None,
            "phone_original": customer.phone_original if customer else None,
            "phone_normalized": customer.phone_normalized if customer else None,
            "trust_score": float(customer.trust_score) if customer else None,
        } if customer else None,
        "business": {
            "id": str(business.id) if business else None,
            "name": business.name if business else None,
            "payment_model": business.payment_model.value if business and business.payment_model else None,
            "collect_payment_before_delivery": business.collect_payment_before_delivery if business else None,
        } if business else None,
        "rider": {
            "id": str(rider.id) if rider else None,
            "name": rider.name if rider else None,
            "phone": rider.phone if rider else None,
            "status": rider.status.value if rider else None,
            "assignment_status": assignment.status.value if assignment else None,
            "assigned_at": assignment.assigned_at.isoformat() if assignment and assignment.assigned_at else None,
        } if rider else None,
        "payment": {
            "id": str(payment.id) if payment else None,
            "provider": payment.provider if payment else None,
            "status": payment.status.value if payment else None,
            "amount": float(payment.amount) if payment else None,
            "initiated_at": payment.initiated_at.isoformat() if payment and payment.initiated_at else None,
            "completed_at": payment.completed_at.isoformat() if payment and payment.completed_at else None,
        } if payment else None,
        "settlement": {
            "id": str(settlement.id) if settlement else None,
            "amount": float(settlement.amount) if settlement else None,
            "status": settlement.status.value if settlement else None,
            "retry_count": settlement.retry_count if settlement else None,
            "created_at": settlement.created_at.isoformat() if settlement and settlement.created_at else None,
        } if settlement else None,
        "evidence": evidence_list,
        "timeline": timeline,
    }


# ── Payment Policies ──────────────────────────────────────────
@router.get("/payment-policies")
async def list_payment_policies(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = PaymentPolicyRepository(db)
    policies = await repo.list_all()
    return [
        {
            "id": str(p.id),
            "key": p.key,
            "value": p.value,
            "description": p.description,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in policies
    ]

@router.put("/payment-policies/{key}")
async def update_payment_policy(
    key: str,
    value: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = PaymentPolicyRepository(db)
    policy = await repo.get(key)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    policy.value = value
    await db.commit()
    await db.refresh(policy)
    # If the updated key is the collection channel, also update the settings cache
    if key == "collection_channel_id":
        from app.core.config import settings
        settings.payhero_collection_channel_id = int(value)
    audit = AuditLog(
        table_name='payment_policies',
        record_id=policy.id,
        action='ADMIN_UPDATED_POLICY',
        changed_by=admin.id,
        new_values={"key": key, "value": value},
    )
    db.add(audit)
    await db.commit()
    return {"key": key, "value": value, "status": "updated"}

# ── Credit Plans CRUD ────────────────────────────────────────
@router.get("/credit-plans")
async def list_credit_plans(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = CreditPlanRepository(db)
    plans = await repo.list_active()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "price": float(p.price),
            "credit_amount": float(p.credit_amount),
            "credit_volume": float(p.credit_volume),
            "active": p.active,
            "description": p.description,
        }
        for p in plans
    ]

@router.post("/credit-plans", status_code=status.HTTP_201_CREATED)
async def create_credit_plan(
    name: str,
    price: float,
    credit_amount: float,
    credit_volume: float,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    description: str | None = None,
):
    plan = CreditPlan(
        name=name, price=price, credit_amount=credit_amount,
        credit_volume=credit_volume, description=description, active=True,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    audit = AuditLog(
        table_name='credit_plans',
        record_id=plan.id,
        action='ADMIN_CREATED_CREDIT_PLAN',
        changed_by=admin.id,
        new_values={"name": name, "price": price},
    )
    db.add(audit)
    await db.commit()
    return {"id": str(plan.id), "name": plan.name, "status": "created"}

@router.put("/credit-plans/{plan_id}")
async def update_credit_plan(
    plan_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    name: str | None = None,
    price: float | None = None,
    credit_amount: float | None = None,
    credit_volume: float | None = None,
    active: bool | None = None,
    description: str | None = None,
):
    plan = await db.get(CreditPlan, uuid.UUID(plan_id))
    if not plan:
        raise HTTPException(status_code=404, detail="Credit plan not found")
    if name is not None: plan.name = name
    if price is not None: plan.price = price
    if credit_amount is not None: plan.credit_amount = credit_amount
    if credit_volume is not None: plan.credit_volume = credit_volume
    if active is not None: plan.active = active
    if description is not None: plan.description = description
    await db.commit()
    await db.refresh(plan)
    return {"id": str(plan.id), "name": plan.name, "status": "updated"}

@router.delete("/credit-plans/{plan_id}")
async def deactivate_credit_plan(
    plan_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    plan = await db.get(CreditPlan, uuid.UUID(plan_id))
    if not plan:
        raise HTTPException(status_code=404, detail="Credit plan not found")
    plan.active = False
    await db.commit()
    return {"id": str(plan.id), "status": "deactivated"}

# ── Global Credit Purchase History ────────────────────────────
@router.get("/credit-orders")
async def list_all_credit_orders(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    """Global credit purchase history across all businesses."""
    result = await db.execute(
        select(MerchantCreditOrder)
        .order_by(MerchantCreditOrder.initiated_at.desc())
        .offset(skip)
        .limit(limit)
    )
    orders = result.scalars().all()
    return [
        {
            "id": str(o.id),
            "business_id": str(o.business_id),
            "amount_paid": float(o.amount_paid),
            "credit_received": float(o.credit_received),
            "status": o.status.value,
            "payment_reference": o.payment_reference,
            "initiated_at": o.initiated_at.isoformat() if o.initiated_at else None,
            "completed_at": o.completed_at.isoformat() if o.completed_at else None,
        }
        for o in orders
    ]

# ── Category Management ─────────────────────────────────────
@router.get("/categories")
async def list_categories(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return all categories."""
    result = await db.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "acceptance_timeout_minutes": c.acceptance_timeout_minutes,
            "requires_deposit": c.requires_deposit,
        }
        for c in categories
    ]

@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    name: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    acceptance_timeout_minutes: int = 60,
    requires_deposit: bool = False,
):
    """Create a new category."""
    existing = await db.execute(select(Category).where(Category.name == name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category already exists")
    cat = Category(name=name, acceptance_timeout_minutes=acceptance_timeout_minutes, requires_deposit=requires_deposit)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return {"id": cat.id, "name": cat.name, "status": "created"}

@router.put("/categories/{category_id}")
async def update_category(
    category_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    name: str | None = None,
    acceptance_timeout_minutes: int | None = None,
    requires_deposit: bool | None = None,
):
    """Update a category."""
    cat = await db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if name is not None: cat.name = name
    if acceptance_timeout_minutes is not None: cat.acceptance_timeout_minutes = acceptance_timeout_minutes
    if requires_deposit is not None: cat.requires_deposit = requires_deposit
    await db.commit()
    await db.refresh(cat)
    return {"id": cat.id, "name": cat.name, "status": "updated"}

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a category. Reject if businesses are still using it."""
    cat = await db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    # Check for existing businesses using this category
    biz_count = await db.scalar(
        select(func.count(Business.id)).where(Business.category_id == category_id)
    )
    if biz_count and biz_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete – {biz_count} business(es) are still using this category. Reassign them first.",
        )
    await db.delete(cat)
    await db.commit()
    return {"status": "deleted"}

