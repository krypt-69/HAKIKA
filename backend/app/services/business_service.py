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
from app.integrations.payhero import register_payment_channel, PayHeroRegistrationError
from app.models.business import PaymentModel, ChannelType
from app.models.payment_method import PaymentMethodType
from app.core.exceptions import HakikaHTTPException
from app.constants.payment_policies import PaymentPolicyKey
from app.services.payment_policy_service import PaymentPolicyService
from app.repositories.payment_policy_repository import PaymentPolicyRepository
from datetime import datetime

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
        payment_model = data.payment_model
        # PayHero channel registration for credit model (BEFORE any DB writes)
        channel_id = None
        channel_type_str = None
        if payment_model == PaymentModel.credit:
            channel_type_str = data.payment_method.type.value
            # For PayBill, require paybill_short_code; for Till, use account_number as short_code
            if data.payment_method.type == PaymentMethodType.paybill:
                if not data.payment_method.paybill_short_code:
                    raise HakikaHTTPException(
                        status_code=400,
                        detail="PayBill number is required.",
                        code="INVALID_PAYBILL_DETAILS",
                    )
                short_code = data.payment_method.paybill_short_code
            else:
                short_code = data.payment_method.account_number
            account_number = data.payment_method.account_number
            account_number = data.payment_method.account_number
            try:
                channel_id = await register_payment_channel(
                    channel_type=channel_type_str,
                    short_code=short_code,
                    account_number=account_number,
                    description=data.name,
                )
            except PayHeroRegistrationError:
                raise HakikaHTTPException(
                    status_code=400,
                    detail="Unable to register merchant payment channel. Please check your payment details.",
                    code="CHANNEL_REGISTRATION_FAILED",
                )
        # Create business and related records
        business = await self.business_repo.create(
            owner_id=user.id, name=data.name, category_id=data.category_id, description=data.description
        )
        business.collect_payment_before_delivery = data.collect_payment_before_delivery
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
            account_number=data.payment_method.account_number,
            paybill_short_code=data.payment_method.paybill_short_code
            )
        # Update business with channel metadata for credit model
        if payment_model == PaymentModel.credit:
            await self.business_repo.update(business,
                payment_model=PaymentModel.credit,
                channel_id=channel_id,
                channel_type=ChannelType(channel_type_str),
                channel_account=data.payment_method.account_number,
            )
            await self._apply_free_trial(business)
            await self.business_repo.update(
                business,
                credit_balance=business.credit_balance,
                remaining_credit_volume=business.remaining_credit_volume,
            )
        return self._build_response(business, [location], hours_objs, [pm])

    async def _apply_free_trial(self, business: Business) -> None:
        """Apply free-trial credit and volume if enabled."""
        policy_repo = PaymentPolicyRepository(self.business_repo.db)
        policy_service = PaymentPolicyService(policy_repo)
        try:
            enabled = await policy_service.get(PaymentPolicyKey.TRIAL_ENABLED, cast=bool)
        except KeyError:
            return
        if not enabled:
            return
        try:
            trial_credit = await policy_service.get(PaymentPolicyKey.TRIAL_CREDIT, cast=float)
        except KeyError:
            trial_credit = 0.0
        try:
            trial_volume = await policy_service.get(PaymentPolicyKey.TRIAL_VOLUME, cast=float)
        except KeyError:
            trial_volume = 0.0
        from decimal import Decimal
        from datetime import datetime, timedelta
        from app.models.credit_allocation import CreditAllocation

        business.credit_balance += Decimal(str(trial_credit))
        business.remaining_credit_volume += Decimal(str(trial_volume))

        # Trial expiry duration
        try:
            trial_expiry_days = int(await policy_service.get(PaymentPolicyKey.TRIAL_EXPIRY_DAYS, cast=float))
        except KeyError:
            trial_expiry_days = 30

        if trial_credit > 0 or trial_volume > 0:
            now = datetime.utcnow()
            allocation = CreditAllocation(
                business_id=business.id,
                type="trial",
                original_credit=trial_credit,
                remaining_credit=trial_credit,
                original_volume=trial_volume,
                remaining_volume=trial_volume,
                granted_at=now,
                expires_at=now + timedelta(days=trial_expiry_days),
            )
            self.business_repo.db.add(allocation)

    async def get_my_businesses(self, user: User) -> list[BusinessResponse]:
        businesses = await self.business_repo.get_by_owner(user.id)
        resp = []
        for b in businesses:
            locs = await self.location_repo.get_by_business(b.id)
            hrs = await self.hours_repo.get_by_business(b.id)
            pms = await self.payment_repo.get_by_business(b.id)
            expiry = await self._next_credit_expiry(b.id)
            resp.append(self._build_response(b, locs, hrs, pms, next_credit_expiry=expiry))
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
        expiry = await self._next_credit_expiry(business.id)
        return self._build_response(business, locs, hrs, pms, next_credit_expiry=expiry)

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
            await self.payment_repo.create(
                business_id, data.payment_method.type, data.payment_method.account_number,
                paybill_short_code=data.payment_method.paybill_short_code
            )
        if data.collect_payment_before_delivery is not None:
            await self.business_repo.update(
                business,
                collect_payment_before_delivery=data.collect_payment_before_delivery,
            )
        return await self.get_business_detail(business_id, user)

    async def delete_business(self, business_id: uuid.UUID, user: User):
        business = await self.business_repo.get_by_id(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        if business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        await self.business_repo.soft_delete(business)

    async def _next_credit_expiry(self, business_id: uuid.UUID) -> datetime | None:
        """Earliest non-expired allocation with remaining credit/volume, or None."""
        from app.repositories.credit_allocation_repository import CreditAllocationRepository
        repo = CreditAllocationRepository(self.business_repo.db)
        rows = await repo.list_valid_for_business(business_id, datetime.utcnow())
        if not rows:
            return None
        return rows[0].expires_at

    def _build_response(self, business: Business, locations: list, hours: list, payment_methods: list, next_credit_expiry: datetime | None = None) -> BusinessResponse:
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
            payment_model=business.payment_model.value if business.payment_model else None,
            collect_payment_before_delivery=business.collect_payment_before_delivery,
            credit_balance=float(business.credit_balance) if business.credit_balance else 0.0,
            remaining_credit_volume=float(business.remaining_credit_volume) if business.remaining_credit_volume else 0.0,
            next_credit_expiry=next_credit_expiry,
            logo_url=business.logo_url, locations=loc_resps, operating_hours=hrs_resps,
            payment_methods=pm_resps
        )
