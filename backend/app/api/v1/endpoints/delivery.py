from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import Response
from sqlalchemy import select as sa_select
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.repositories.delivery_repository import DeliveryRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.rider_repository import RiderRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.customer_repository import CustomerRepository
from app.models.order import OrderStatus
from app.models.order import Order
from app.models.delivery_attempt import DeliveryAttemptStatus
from app.models.delivery_assignment import DeliveryAssignment, AssignmentStatus
from app.models.rider import Rider
from app.models.delivery_attempt import DeliveryAttempt
from app.models.delivery_evidence import DeliveryEvidence
from app.utils.images import validate_and_process
from fastapi import UploadFile, File
import uuid
from geoalchemy2.shape import to_shape

router = APIRouter(prefix="/delivery", tags=["delivery"])

def get_delivery_repo(db: AsyncSession = Depends(get_db)):
    return DeliveryRepository(db)

def serialize_point(point):
    """Convert a PostGIS Geography point to a dict with lat/lon."""
    if point is None:
        return None
    p = to_shape(point)
    return {"lat": p.y, "lon": p.x}

@router.put("/orders/{order_id}/assign")
async def assign_rider(
    order_id: str,
    rider_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    delivery_repo = DeliveryRepository(db)
    order_repo = OrderRepository(db)
    rider_repo = RiderRepository(db)
    business_repo = BusinessRepository(db)

    order = await order_repo.get_by_id(uuid.UUID(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    business = await business_repo.get_by_id(order.business_id)
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    rider = await rider_repo.get_by_id(uuid.UUID(rider_id))
    if not rider or rider.business_id != order.business_id:
        raise HTTPException(status_code=403, detail="Rider does not belong to this business")
    if order.status not in (OrderStatus.accepted, OrderStatus.preparing, OrderStatus.ready_for_delivery):
        raise HTTPException(status_code=400, detail="Order not ready for delivery")
    await delivery_repo.assign_rider(order.id, rider.id)
    await order_repo.update_status(order, OrderStatus.out_for_delivery)
    return {"status": "assigned"}

@router.put("/orders/{order_id}/arrive")
async def mark_arrived(
    order_id: str,
    gps_lat: float,
    gps_lon: float,
    photo_url: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    delivery_repo = DeliveryRepository(db)
    order_repo = OrderRepository(db)
    rider_repo = RiderRepository(db)

    order = await order_repo.get_by_id(uuid.UUID(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    assignment = await db.execute(
        sa_select(DeliveryAssignment).where(
            DeliveryAssignment.order_id == uuid.UUID(order_id),
            DeliveryAssignment.status == AssignmentStatus.assigned,
        )
    )
    assignment = assignment.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=400, detail="No active rider assigned")
    rider = await rider_repo.get_by_id(assignment.rider_id)
    if not rider or rider.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your delivery")
    if order.status != OrderStatus.out_for_delivery:
        raise HTTPException(status_code=400, detail="Order is not out for delivery")

    await delivery_repo.create_attempt(
        order_id=order.id,
        rider_id=rider.id,
        status=DeliveryAttemptStatus.successful,
        gps_lat=gps_lat,
        gps_lon=gps_lon,
        photo_url=photo_url,
        evidence_required=False
    )
    await order_repo.update_status(order, OrderStatus.arrived)
    return {"status": "arrived"}

@router.put("/orders/{order_id}/attempt")
async def record_attempt(
    order_id: str,
    status: DeliveryAttemptStatus,
    gps_lat: float,
    gps_lon: float,
    photo_url: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    delivery_repo = DeliveryRepository(db)
    order_repo = OrderRepository(db)
    rider_repo = RiderRepository(db)

    order = await order_repo.get_by_id(uuid.UUID(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    assignment = await db.execute(
        sa_select(DeliveryAssignment).where(
            DeliveryAssignment.order_id == uuid.UUID(order_id),
            DeliveryAssignment.status == AssignmentStatus.assigned,
        )
    )
    assignment = assignment.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=400, detail="No active rider assigned")
    rider = await rider_repo.get_by_id(assignment.rider_id)
    if not rider or rider.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your delivery")
    # FIX: allow both out_for_delivery and arrived for evidence recording
    if order.status not in (OrderStatus.out_for_delivery, OrderStatus.arrived):
        raise HTTPException(status_code=400, detail="Order is not out for delivery")

    await delivery_repo.create_attempt(
        order_id=order.id,
        rider_id=rider.id,
        status=status,
        gps_lat=gps_lat,
        gps_lon=gps_lon,
        photo_url=photo_url,
        evidence_required=False
    )
    return {"status": "recorded"}

@router.get("/orders/{order_id}")
async def get_order_for_rider(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    delivery_repo = DeliveryRepository(db)
    order_repo = OrderRepository(db)
    rider_repo = RiderRepository(db)

    order = await order_repo.get_by_id(uuid.UUID(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    assignment = await db.execute(
        sa_select(DeliveryAssignment).where(
            DeliveryAssignment.order_id == uuid.UUID(order_id),
            DeliveryAssignment.status == AssignmentStatus.assigned,
        )
    )
    assignment = assignment.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=403, detail="No active rider for this order")
    rider = await rider_repo.get_by_id(assignment.rider_id)
    if not rider or rider.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your delivery")

    order_data = {
        "id": str(order.id),
        "order_number": order.order_number,
        "status": order.status.value,
        "subtotal": float(order.subtotal),
        "delivery_fee": float(order.delivery_fee),
        "total_amount": float(order.total_amount),
        "customer_id": str(order.customer_id),
        "business_id": str(order.business_id),
        "customer_phone": None,
    }
    if order.status in (OrderStatus.arrived, OrderStatus.customer_confirmed_delivery, OrderStatus.payment_pending, OrderStatus.paid, OrderStatus.completed):
        customer_repo = CustomerRepository(db)
        customer = await customer_repo.get_by_id(order.customer_id)
        order_data["customer_phone"] = customer.phone_normalized if customer else None
    items = await order_repo.get_order_items(order.id)
    order_data["items"] = [{"id": str(i.id), "product_name": i.product_name, "unit_price": float(i.unit_price), "quantity": i.quantity} for i in items]
    return order_data

@router.get("/my-orders")
async def rider_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    rider_result = await db.execute(sa_select(Rider).where(Rider.user_id == current_user.id))
    rider = rider_result.scalar_one_or_none()
    if not rider:
        raise HTTPException(status_code=403, detail="Not a rider")
    assignments = await db.execute(
        sa_select(DeliveryAssignment).where(
            DeliveryAssignment.rider_id == rider.id,
            DeliveryAssignment.status == AssignmentStatus.assigned
        )
    )
    order_ids = [a.order_id for a in assignments.scalars().all()]
    if not order_ids:
        return []

    orders = await db.execute(sa_select(Order).where(Order.id.in_(order_ids)))
    orders_list = orders.scalars().all()

    order_repo = OrderRepository(db)
    customer_repo = CustomerRepository(db)
    result = []
    for order in orders_list:
        items = await order_repo.get_order_items(order.id)
        # Gather product IDs for thumbnails
        product_ids = [i.product_id for i in items if i.product_id]
        thumb_map = {}
        if product_ids:
            from app.models.product_image import ProductImage
            img_result = await db.execute(
                sa_select(ProductImage).where(
                    ProductImage.product_id.in_(product_ids),
                    ProductImage.position == 1
                )
            )
            for img in img_result.scalars().all():
                thumb_map[img.product_id] = f"/api/v1/product/{img.id}"

        item_data = []
        for i in items:
            item_data.append({
                "id": str(i.id),
                "product_name": i.product_name,
                "unit_price": float(i.unit_price),
                "quantity": i.quantity,
                "thumbnail_url": thumb_map.get(i.product_id)
            })

        # Customer name
        customer = await customer_repo.get_by_id(order.customer_id)
        customer_name = customer.phone_normalized if customer else None

        # Business info
        from app.repositories.business_repository import BusinessRepository
        business_repo = BusinessRepository(db)
        business = await business_repo.get_by_id(order.business_id)
        business_name = business.name if business else None
        business_logo = f"/api/v1/businesses/{order.business_id}/logo" if business else None

        order_data = {
            "id": str(order.id),
            "order_number": order.order_number,
            "status": order.status.value,
            "subtotal": float(order.subtotal),
            "delivery_fee": float(order.delivery_fee),
            "total_amount": float(order.total_amount),
            "customer_id": str(order.customer_id),
            "business_id": str(order.business_id),
            "items": item_data,
            "customer_phone": None,
            "customer_name": customer_name,
            "business_name": business_name,
            "business_logo": business_logo,
            "delivery_location": serialize_point(order.delivery_coordinates),
            "pickup_location": None,  # FIXME: add proper location loading
        }
        if order.status.value in ('arrived', 'customer_confirmed_delivery', 'payment_pending', 'paid', 'completed'):
            order_data["customer_phone"] = customer.phone_normalized if customer else None
        result.append(order_data)
    return result

@router.post("/orders/{order_id}/evidence")
async def upload_evidence(
    order_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assignment = await db.execute(
        sa_select(DeliveryAssignment).where(
            DeliveryAssignment.order_id == uuid.UUID(order_id),
            DeliveryAssignment.status == AssignmentStatus.assigned,
        )
    )
    assignment = assignment.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=403, detail="No active assignment for this order")
    rider = await db.execute(sa_select(Rider).where(Rider.user_id == current_user.id))
    rider = rider.scalar_one_or_none()
    if not rider or rider.id != assignment.rider_id:
        raise HTTPException(status_code=403, detail="Not your delivery")
    image_data = validate_and_process(file, max_dim=1200, max_bytes=200_000)
    attempt = await db.execute(
        sa_select(DeliveryAttempt)
        .where(DeliveryAttempt.order_id == uuid.UUID(order_id))
        .order_by(DeliveryAttempt.attempt_time.desc())
        .limit(1)
    )
    attempt = attempt.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=400, detail="No delivery attempt found")
    evidence = DeliveryEvidence(
        delivery_attempt_id=attempt.id,
        image_data=image_data,
    )
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)
    return {"evidence_id": str(evidence.id), "url": f"/api/v1/delivery/evidence/{evidence.id}"}

@router.get("/evidence/{evidence_id}")
async def get_evidence(evidence_id: str, db: AsyncSession = Depends(get_db)):
    evidence = await db.get(DeliveryEvidence, uuid.UUID(evidence_id))
    if not evidence:
        raise HTTPException(status_code=404)
    return Response(content=evidence.image_data, media_type="image/webp")
