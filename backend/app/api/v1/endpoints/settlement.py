from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.repositories.settlement_repository import SettlementRepository
from app.repositories.business_repository import BusinessRepository
import uuid

router = APIRouter(prefix="/settlements", tags=["settlements"])

@router.get("")
async def my_settlements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    business_repo = BusinessRepository(db)
    businesses = await business_repo.get_by_owner(current_user.id)
    if not businesses:
        return []
    settlement_repo = SettlementRepository(db)
    result = []
    for biz in businesses:
        settlements = await settlement_repo.get_by_business(biz.id)
        for s in settlements:
            result.append({
                "id": str(s.id),
                "business_id": str(s.business_id),
                "amount": float(s.amount),
                "status": s.status.value,
                "created_at": s.created_at.isoformat() if s.created_at else None
            })
    return result
