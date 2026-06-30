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
from app.models.settlement import SettlementStatus
from app.models.audit_log import AuditLog
import uuid

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
    from app.repositories.dispute_repository import DisputeRepository
    repo = DisputeRepository(db)
    # need to add a list_all method, but we can just query here for now
    from app.models.dispute import Dispute
    result = await db.execute(
        Dispute.__table__.select().order_by(Dispute.created_at.desc())
    )
    disputes = result.all()
    return [dict(d) for d in disputes]

@router.put("/disputes/{id}/resolve")
async def resolve_dispute(
    id: str,
    resolution: str,  # "resolved_customer" or "resolved_business"
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    from app.repositories.dispute_repository import DisputeRepository
    from app.models.dispute import DisputeStatus
    repo = DisputeRepository(db)
    dispute = await repo.get_by_order(uuid.UUID(id))  # actually id is dispute_id, we'll pass dispute_id
    # Correction: get_by_order expects order_id, not dispute id. We need a get_by_id method.
    # We'll adjust quickly: add a simple get_by_id in dispute repo.
    # For now, we'll implement a manual query.
    from app.models.dispute import Dispute
    result = await db.execute(Dispute.__table__.select().where(Dispute.id == uuid.UUID(id)))
    dispute = result.first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    new_status = DisputeStatus.resolved_customer if resolution == "resolved_customer" else DisputeStatus.resolved_business
    await db.execute(
        Dispute.__table__.update().where(Dispute.id == uuid.UUID(id)).values(
            status=new_status,
            resolved_by=admin.id,
            resolved_at="NOW()"
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
    from app.repositories.business_repository import BusinessRepository
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
