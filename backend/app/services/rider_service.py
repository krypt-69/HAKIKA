from app.repositories.rider_repository import RiderRepository
from app.repositories.business_repository import BusinessRepository
from app.models.user import User
from app.schemas.rider import RiderCreate, RiderResponse
from app.core.phone import normalize_phone
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
import uuid

class RiderService:
    def __init__(self, rider_repo: RiderRepository, business_repo: BusinessRepository):
        self.rider_repo = rider_repo
        self.business_repo = business_repo

    async def list_riders(self, user: User, business_id: uuid.UUID) -> list[RiderResponse]:
        business = await self.business_repo.get_by_id(business_id)
        if not business or business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        riders = await self.rider_repo.list_by_business(business_id)
        return [self._to_response(r) for r in riders]

    def _to_response(self, rider) -> RiderResponse:
        profile_picture_url = None
        return RiderResponse(
            id=rider.id,
            business_id=rider.business_id,
            name=rider.name,
            email=rider.email,
            phone=rider.phone,
            status=rider.status.value,
            profile_picture_url=profile_picture_url
        )
