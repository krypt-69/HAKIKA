from app.repositories.business_repository import BusinessRepository
from app.repositories.category_repository import CategoryRepository
from app.repositories.location_repository import LocationRepository
from app.repositories.operating_hours_repository import OperatingHoursRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.schemas.business import BusinessCreateRequest, BusinessUpdateRequest, BusinessResponse
from app.schemas.business import LocationResponse, OperatingHoursResponse, PaymentMethodResponse
from app.models.user import User
from app.models.business import Business
from app.models.operating_hours import OperatingHours
import uuid
from fastapi import HTTPException, status
from shapely import wkb
from geoalchemy2.shape import to_shape

class BusinessService:
    def __init__(
        self,
        business_repo: BusinessRepository,
        category_repo: CategoryRepository,
        location_repo: LocationRepository,
        hours_repo: OperatingHoursRepository,
        payment_repo: PaymentMethodRepository
    ):
        self.business_repo = business_repo
        self.category_repo = category_repo
        self.location_repo = location_repo
        self.hours_repo = hours_repo
        self.payment_repo = payment_repo

    async def create_business(self, user: User, data: BusinessCreateRequest) -> BusinessResponse:
        category = await self.category_repo.get_by_id(data.category_id)
        if not category:
            raise HTTPException(status_code=400, detail="Category not found")
        business = await self.business_repo.create(
            owner_id=user.id, name=data.name, category_id=data.category_id, description=data.description
        )
        location = await self.location_repo.create(
            business_id=business.id, lat=data.location.lat, lon=data.location.lon,
            address_text=data.location.address_text, is_primary=data.location.is_primary
        )
        hours_objs = []
        for h in data.operating_hours:
            hours_obj = await self.hours_repo.create(
                business_id=business.id, day_of_week=h.day_of_week,
                opens_at=h.opens_at, closes_at=h.closes_at, is_closed=h.is_closed
            )
            hours_objs.append(hours_obj)
        pm = await self.payment_repo.create(
            business_id=business.id, type=data.payment_method.type,
            account_number=data.payment_method.account_number
        )
        return self._build_response(business, [location], hours_objs, [pm])

    async def get_my_businesses(self, user: User) -> list[BusinessResponse]:
        businesses = await self.business_repo.get_by_owner(user.id)
        resp = []
        for b in businesses:
            locs = await self.location_repo.get_by_business(b.id)
            hrs = await self.hours_repo.get_by_business(b.id)
            pms = await self.payment_repo.get_by_business(b.id)
            resp.append(self._build_response(b, locs, hrs, pms))
        return resp

    async def get_business_detail(self, business_id: uuid.UUID, user: User) -> BusinessResponse:
        business = await self.business_repo.get_by_id(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        if business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        locs = await self.location_repo.get_by_business(business.id)
        hrs = await self.hours_repo.get_by_business(business.id)
        pms = await self.payment_repo.get_by_business(business.id)
        return self._build_response(business, locs, hrs, pms)

    async def update_business(self, business_id: uuid.UUID, user: User, data: BusinessUpdateRequest) -> BusinessResponse:
        business = await self.business_repo.get_by_id(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        if business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        update_data = {}
        if data.name is not None:
            update_data['name'] = data.name
        if data.description is not None:
            update_data['description'] = data.description
        if update_data:
            business = await self.business_repo.update(business, **update_data)
        if data.location is not None:
            locs = await self.location_repo.get_by_business(business_id)
            if locs:
                primary = next((l for l in locs if l.is_primary), locs[0])
                await self.location_repo.update(primary, lat=data.location.lat, lon=data.location.lon,
                                                address_text=data.location.address_text, is_primary=data.location.is_primary)
            else:
                await self.location_repo.create(business_id, data.location.lat, data.location.lon,
                                                data.location.address_text, data.location.is_primary)
        if data.operating_hours is not None:
            # Delete old hours and recreate (using the existing session, no nested begin)
            from sqlalchemy import delete
            await self.hours_repo.db.execute(
                delete(OperatingHours).where(OperatingHours.business_id == business_id)
            )
            for h in data.operating_hours:
                self.hours_repo.db.add(OperatingHours(
                    business_id=business_id, day_of_week=h.day_of_week,
                    opens_at=h.opens_at, closes_at=h.closes_at, is_closed=h.is_closed
                ))
            await self.hours_repo.db.commit()
        if data.payment_method is not None:
            old_methods = await self.payment_repo.get_by_business(business_id)
            for pm in old_methods:
                await self.payment_repo.update(pm, is_active=False)
            await self.payment_repo.create(business_id, data.payment_method.type, data.payment_method.account_number)
        return await self.get_business_detail(business_id, user)

    async def delete_business(self, business_id: uuid.UUID, user: User):
        business = await self.business_repo.get_by_id(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        if business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        await self.business_repo.soft_delete(business)

    def _build_response(self, business: Business, locations: list, hours: list, payment_methods: list) -> BusinessResponse:
        loc_resps = []
        for loc in locations:
            point = to_shape(loc.coordinates)
            loc_resps.append(LocationResponse(
                id=loc.id, lat=point.y, lon=point.x,
                address_text=loc.address_text, is_primary=loc.is_primary
            ))
        hrs_resps = [OperatingHoursResponse.model_validate(h) for h in hours]
        pm_resps = [PaymentMethodResponse.model_validate(pm) for pm in payment_methods]
        return BusinessResponse(
            id=business.id, name=business.name, category_id=business.category_id,
            description=business.description, trust_score=float(business.trust_score),
            logo_url=business.logo_url, locations=loc_resps, operating_hours=hrs_resps,
            payment_methods=pm_resps
        )
