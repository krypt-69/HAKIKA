from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.delivery_assignment import DeliveryAssignment, AssignmentStatus
from app.models.delivery_attempt import DeliveryAttempt, DeliveryAttemptStatus
from app.models.order import Order, OrderStatus
from geoalchemy2.elements import WKTElement
import uuid
from datetime import datetime

class DeliveryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def assign_rider(self, order_id: uuid.UUID, rider_id: uuid.UUID) -> DeliveryAssignment:
        # Deactivate previous assignments for this order
        old_assign = await self.db.execute(
            select(DeliveryAssignment).where(
                DeliveryAssignment.order_id == order_id,
                DeliveryAssignment.status == AssignmentStatus.assigned
            )
        )
        for assign in old_assign.scalars().all():
            assign.status = AssignmentStatus.unassigned

        assignment = DeliveryAssignment(
            order_id=order_id,
            rider_id=rider_id,
            status=AssignmentStatus.assigned
        )
        self.db.add(assignment)
        await self.db.commit()
        await self.db.refresh(assignment)
        return assignment

    async def get_active_assignment(self, order_id: uuid.UUID) -> DeliveryAssignment | None:
        result = await self.db.execute(
            select(DeliveryAssignment).where(
                DeliveryAssignment.order_id == order_id,
                DeliveryAssignment.status == AssignmentStatus.assigned
            )
        )
        return result.scalar_one_or_none()

    async def create_attempt(
        self,
        order_id: uuid.UUID,
        rider_id: uuid.UUID,
        status: DeliveryAttemptStatus,
        gps_lat: float | None = None,
        gps_lon: float | None = None,
        photo_url: str | None = None,
        evidence_required: bool = True
    ) -> DeliveryAttempt:
        attempt = DeliveryAttempt(
            order_id=order_id,
            rider_id=rider_id,
            status=status,
            photo_url=photo_url,
            gps_point=WKTElement(f"POINT({gps_lon} {gps_lat})", srid=4326) if gps_lat is not None and gps_lon is not None else None,
            attempt_time=datetime.utcnow(),
            evidence_required=evidence_required
        )
        self.db.add(attempt)
        await self.db.commit()
        await self.db.refresh(attempt)
        return attempt

    async def get_attempts_for_order(self, order_id: uuid.UUID) -> list[DeliveryAttempt]:
        result = await self.db.execute(
            select(DeliveryAttempt).where(DeliveryAttempt.order_id == order_id)
        )
        return result.scalars().all()
