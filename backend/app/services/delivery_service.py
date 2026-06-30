from app.repositories.delivery_repository import DeliveryRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.rider_repository import RiderRepository
from app.repositories.business_repository import BusinessRepository
from app.models.order import OrderStatus
from app.models.delivery_attempt import DeliveryAttemptStatus
from app.models.user import User
from fastapi import HTTPException, status
import uuid

class DeliveryService:
    def __init__(
        self,
        delivery_repo: DeliveryRepository,
        order_repo: OrderRepository,
        rider_repo: RiderRepository,
        business_repo: BusinessRepository
    ):
        self.delivery_repo = delivery_repo
        self.order_repo = order_repo
        self.rider_repo = rider_repo
        self.business_repo = business_repo

    async def assign_rider(self, user: User, order_id: uuid.UUID, rider_id: uuid.UUID):
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        # Verify business ownership
        business = await self.business_repo.get_by_id(order.business_id)
        if not business or business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        # Rider must belong to same business
        rider = await self.rider_repo.get_by_id(rider_id)
        if not rider or rider.business_id != order.business_id:
            raise HTTPException(status_code=403, detail="Rider does not belong to this business")
        if order.status not in (OrderStatus.accepted, OrderStatus.preparing, OrderStatus.ready_for_delivery):
            raise HTTPException(status_code=400, detail="Order not ready for delivery")
        # Assign and move to OUT_FOR_DELIVERY
        await self.delivery_repo.assign_rider(order.id, rider.id)
        await self.order_repo.update_status(order, OrderStatus.out_for_delivery)

    async def mark_arrived(self, rider_user: User, order_id: uuid.UUID, gps_lat: float, gps_lon: float, photo_url: str | None = None):
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        # Verify rider is assigned to this order
        assignment = await self.delivery_repo.get_active_assignment(order_id)
        if not assignment:
            raise HTTPException(status_code=400, detail="No active rider assigned")
        # Rider must be the authenticated rider user linked to the rider record
        rider = await self.rider_repo.get_by_id(assignment.rider_id)
        if not rider or rider.user_id != rider_user.id:
            raise HTTPException(status_code=403, detail="Not your delivery")
        if order.status != OrderStatus.out_for_delivery:
            raise HTTPException(status_code=400, detail="Order is not out for delivery")

        # Record successful attempt
        await self.delivery_repo.create_attempt(
            order_id=order.id,
            rider_id=rider.id,
            status=DeliveryAttemptStatus.successful,
            gps_lat=gps_lat,
            gps_lon=gps_lon,
            photo_url=photo_url,
            evidence_required=False  # optional for now
        )
        await self.order_repo.update_status(order, OrderStatus.arrived)

    async def record_failed_attempt(self, rider_user: User, order_id: uuid.UUID, reason: DeliveryAttemptStatus, gps_lat: float, gps_lon: float):
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        assignment = await self.delivery_repo.get_active_assignment(order_id)
        if not assignment:
            raise HTTPException(status_code=400, detail="No active rider assigned")
        rider = await self.rider_repo.get_by_id(assignment.rider_id)
        if not rider or rider.user_id != rider_user.id:
            raise HTTPException(status_code=403, detail="Not your delivery")
        if order.status != OrderStatus.out_for_delivery:
            raise HTTPException(status_code=400, detail="Order is not out for delivery")

        # Record failed attempt
        await self.delivery_repo.create_attempt(
            order_id=order.id,
            rider_id=rider.id,
            status=reason,
            gps_lat=gps_lat,
            gps_lon=gps_lon,
            evidence_required=False
        )
        # Order remains OUT_FOR_DELIVERY, no status change
        # Later phases may trigger DELIVERY_FAILED after max attempts

    async def get_order_for_rider(self, rider_user: User, order_id: uuid.UUID) -> dict:
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        # Verify rider is assigned
        assignment = await self.delivery_repo.get_active_assignment(order_id)
        if not assignment:
            raise HTTPException(status_code=403, detail="No active rider for this order")
        rider = await self.rider_repo.get_by_id(assignment.rider_id)
        if not rider or rider.user_id != rider_user.id:
            raise HTTPException(status_code=403, detail="Not your delivery")

        # Build response with phone only if arrived
        order_data = {
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status.value,
            "subtotal": float(order.subtotal),
            "delivery_fee": float(order.delivery_fee),
            "total_amount": float(order.total_amount),
            "customer_id": order.customer_id,
            "business_id": order.business_id,
        }
        # Fetch customer phone only if status >= arrived
        if order.status in (OrderStatus.arrived, OrderStatus.customer_confirmed_delivery, OrderStatus.payment_pending, OrderStatus.paid, OrderStatus.completed):
            from app.repositories.customer_repository import CustomerRepository
            customer_repo = CustomerRepository(self.order_repo.db)  # hack: but we'll do properly
            # Actually, we need a session. Let's pass the db session.
            # We'll modify the endpoint to pass db and get customer.
            # For now, skip phone or fetch via additional method.
            # We'll handle in endpoint.
            pass
        return order_data
