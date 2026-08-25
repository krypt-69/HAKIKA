from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.trust_event_repository import TrustEventRepository
from app.models.user import User
from app.models.order import OrderStatus
from app.models.business import PaymentModel
from app.services.fee_calculator import calculate_processing_fee
from app.services.order_events import publish_order_update
from app.core.exceptions import HakikaHTTPException
from app.schemas.order import OrderCreateRequest, OrderResponse, OrderItemResponse
from app.models.location import Location
from fastapi import HTTPException, status
from geoalchemy2.shape import to_shape
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from app.models.product import Product
from app.models.product_image import ProductImage
import uuid
import logging

logger = logging.getLogger("hakika.order")

class OrderService:
    def __init__(
        self,
        order_repo: OrderRepository,
        customer_repo: CustomerRepository,
        business_repo: BusinessRepository,
        trust_event_repo: TrustEventRepository,
        db: AsyncSession
    ):
        self.order_repo = order_repo
        self.customer_repo = customer_repo
        self.business_repo = business_repo
        self.trust_event_repo = trust_event_repo
        self.db = db

    async def create_order(self, data: OrderCreateRequest) -> OrderResponse:
        if data.phone.startswith("0"):
            normalized = "+254" + data.phone[1:]
        elif data.phone.startswith("254"):
            normalized = "+" + data.phone
        else:
            normalized = data.phone
        customer = await self.customer_repo.get_or_create(data.phone, normalized)

        business = await self.business_repo.get_by_id(data.business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")

        product_ids = [i.product_id for i in data.items]
        result = await self.db.execute(select(Product).where(Product.id.in_(product_ids)))
        products = {p.id: p for p in result.scalars().all()}

        # Build thumbnail map from product_images
        thumbnails = {}
        if product_ids:
            img_result = await self.db.execute(
                select(ProductImage).where(
                    ProductImage.product_id.in_(product_ids),
                    ProductImage.position == 1
                )
            )
            for img in img_result.scalars().all():
                thumbnails[img.product_id] = f"/api/v1/product/{img.id}"
        if len(products) != len(product_ids):
            raise HTTPException(status_code=400, detail="Some products not found or unavailable")

        subtotal = 0.0
        snapshot_items = []
        for item in data.items:
            product = products[item.product_id]
            if not product.is_available or product.deleted_at is not None:
                raise HTTPException(status_code=400, detail=f"Product {product.name} is not available")
            price = float(product.discount_price if product.discount_price and product.discount_price < product.original_price else product.original_price)
            snapshot_items.append({
                'product_id': product.id,
                'product_name': product.name,
                'unit_price': price,
                'quantity': item.quantity,
                'thumbnail_url': thumbnails.get(product.id)
            })
            subtotal += price * item.quantity

        delivery_fee = 0.0
        total = subtotal + delivery_fee

        order = await self.order_repo.create_order_with_items(
            customer_id=customer.id,
            business_id=data.business_id,
            snapshot_items=snapshot_items,
            delivery_coordinates=(data.delivery_lat, data.delivery_lon),
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total_amount=total
        )
        order_items = await self.order_repo.get_order_items(order.id)
        resp = self._to_response(order, order_items)
        return await self._enrich_order_response(order, resp)

    async def accept_order(self, user: User, order_id: uuid.UUID) -> OrderResponse:
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status != OrderStatus.waiting_acceptance:
            raise HTTPException(status_code=400, detail="Order cannot be accepted in current state")
        business = await self.business_repo.get_by_id(order.business_id)
        if business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

        if not business.is_active:
            raise HakikaHTTPException(
                status_code=409,
                detail="Business is currently unavailable.",
                code="BUSINESS_INACTIVE"
            )

        if business.payment_model == PaymentModel.credit:
            if business.remaining_credit_volume < float(order.total_amount):
                raise HakikaHTTPException(
                    status_code=409,
                    detail="Insufficient credit volume to accept this order.",
                    code="INSUFFICIENT_CREDIT"
                )

        previous_status = order.status
        await self.order_repo.update_status(order, OrderStatus.accepted)
        await publish_order_update(order, previous_status)
        order_items = await self.order_repo.get_order_items(order.id)
        customer_phone = await self._get_customer_phone(order.customer_id)
        resp = self._to_response(order, order_items, customer_phone=customer_phone)
        return await self._enrich_order_response(order, resp)

    async def cancel_order(self, actor: str, order_id: uuid.UUID,
                           user: User | None = None, customer_phone: str | None = None) -> OrderResponse:
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status not in (OrderStatus.waiting_acceptance, OrderStatus.accepted):
            raise HTTPException(status_code=400, detail="Order cannot be cancelled in current state")

        if actor == 'customer':
            if not customer_phone:
                raise HTTPException(status_code=400, detail="Customer phone required")
            if customer_phone.startswith("0"):
                normalized = "+254" + customer_phone[1:]
            elif customer_phone.startswith("254"):
                normalized = "+" + customer_phone
            else:
                normalized = customer_phone
            customer = await self.customer_repo.get_or_create(customer_phone, normalized)
            if order.customer_id != customer.id:
                raise HTTPException(status_code=403, detail="Forbidden")
            if order.status == OrderStatus.accepted:
                await self.trust_event_repo.create_trust_event(
                    subject_type='customer', subject_id=customer.id,
                    event_type='CUSTOMER_CANCELLED_AFTER_ACCEPT', score_change=-5,
                    reason="Customer cancelled after acceptance"
                )
            prev = order.status
            await self.order_repo.update_status(order, OrderStatus.cancelled)
            await publish_order_update(order, prev)

        elif actor == 'business':
            if not user:
                raise HTTPException(status_code=401)
            business = await self.business_repo.get_by_id(order.business_id)
            if business.owner_id != user.id:
                raise HTTPException(status_code=403, detail="Forbidden")
            if order.status == OrderStatus.accepted:
                await self.trust_event_repo.create_trust_event(
                    subject_type='business', subject_id=business.id,
                    event_type='BUSINESS_CANCELLED_AFTER_ACCEPT', score_change=-5,
                    reason="Business cancelled after acceptance"
                )
            prev = order.status
            await self.order_repo.update_status(order, OrderStatus.cancelled)
            await publish_order_update(order, prev)
        else:
            raise HTTPException(status_code=400)

        order_items = await self.order_repo.get_order_items(order.id)
        resp = self._to_response(order, order_items)
        return await self._enrich_order_response(order, resp)

    async def get_order(self, order_id: uuid.UUID) -> OrderResponse:
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        items = await self.order_repo.get_order_items(order.id)
        customer_phone = None
        if self._should_expose_customer_phone(order):
            customer_phone = await self._get_customer_phone(order.customer_id)
        resp = self._to_response(order, items, customer_phone=customer_phone)

        if order.delivery_coordinates:
            dist_result = await self.db.execute(
                text("""
                    SELECT ST_Distance(l.coordinates, o.delivery_coordinates) / 1000 AS distance_km
                    FROM locations l
                    JOIN orders o ON o.id = :order_id
                    WHERE l.business_id = :business_id
                      AND l.is_primary = true
                """),
                {
                    "order_id": order.id,
                    "business_id": order.business_id,
                }
            )
            distance = dist_result.scalar_one_or_none()
            resp.distance_km = round(distance, 2) if distance is not None else None
        else:
            resp.distance_km = None
        resp = await self._enrich_order_response(order, resp)
        return resp

    async def list_orders_for_customer(self, phone: str) -> list[OrderResponse]:
        if phone.startswith("0"):
            normalized = "+254" + phone[1:]
        elif phone.startswith("254"):
            normalized = "+" + phone
        else:
            normalized = phone
        customer = await self.customer_repo.get_or_create(phone, normalized)
        orders = await self.order_repo.list_by_customer(customer.id)
        res = []
        for o in orders:
            items = await self.order_repo.get_order_items(o.id)
            resp = self._to_response(o, items)
            resp = await self._enrich_order_response(o, resp)
            res.append(resp)
        return res

    async def list_orders_for_business(self, user: User) -> list[OrderResponse]:
        businesses = await self.business_repo.get_by_owner(user.id)
        if not businesses:
            return []
        business = businesses[0]

        loc_result = await self.db.execute(
            select(func.ST_AsText(Location.coordinates)).where(
                Location.business_id == business.id,
                Location.is_primary == True
            )
        )
        business_geom_wkt = loc_result.scalar_one_or_none()

        orders = await self.order_repo.list_by_business(business.id)
        if not orders:
            return []

        order_ids = [o.id for o in orders]
        distances = {}
        if business_geom_wkt:
            query = text("""
                SELECT
                    o.id AS order_id,
                    ST_Distance(:business_geom, o.delivery_coordinates) / 1000 AS distance_km
                FROM orders o
                WHERE o.id = ANY(:order_ids)
                  AND o.delivery_coordinates IS NOT NULL
            """)
            result = await self.db.execute(query, {
                "business_geom": business_geom_wkt,
                "order_ids": order_ids,
            })
            rows = result.fetchall()
            distances = {row.order_id: round(row.distance_km, 2) for row in rows}

        res = []
        for o in orders:
            items = await self.order_repo.get_order_items(o.id)
            customer_phone = None
            if self._should_expose_customer_phone(o):
                customer_phone = await self._get_customer_phone(o.customer_id)

            resp = self._to_response(o, items, customer_phone=customer_phone)
            resp.distance_km = distances.get(o.id)
            if o.delivery_coordinates is not None:
                point = to_shape(o.delivery_coordinates)
                resp.delivery_location = {"lat": point.y, "lon": point.x}
            else:
                resp.delivery_location = None
            resp = await self._enrich_order_response(o, resp)
            res.append(resp)
        return res

    def _should_expose_customer_phone(self, order) -> bool:
        return order.status in {
            OrderStatus.accepted,
            OrderStatus.preparing,
            OrderStatus.ready_for_delivery,
            OrderStatus.out_for_delivery,
            OrderStatus.arrived,
            OrderStatus.customer_confirmed_delivery,
            OrderStatus.payment_pending,
            OrderStatus.paid,
            OrderStatus.completed,
        }

    async def _get_customer_phone(self, customer_id):
        customer = await self.customer_repo.get_by_id(customer_id)
        return customer.phone_normalized if customer else None

    def _to_response(self, order, order_items, customer_phone: str | None = None) -> OrderResponse:
        return OrderResponse(
            id=order.id,
            order_number=order.order_number,
            status=order.status.value,
            subtotal=float(order.subtotal),
            delivery_fee=float(order.delivery_fee),
            total_amount=float(order.total_amount),
            customer_id=order.customer_id,
            business_id=order.business_id,
            customer_phone=customer_phone,
            items=[OrderItemResponse(
                id=oi.id,
                product_name=oi.product_name,
                unit_price=float(oi.unit_price),
                quantity=oi.quantity,
                product_id=oi.product_id,
                thumbnail_url=getattr(oi, 'primary_thumbnail_url', None)
            ) for oi in order_items],
            created_at=order.created_at
        )

    async def _enrich_order_response(self, order, resp: OrderResponse) -> OrderResponse:
        business = await self.business_repo.get_by_id(order.business_id)
        if business:
            resp.business_name = business.name
            resp.business_logo_url = (
                f"/api/v1/businesses/{business.id}/logo"
                if (business.logo_data or business.logo_url)
                else None
            )
            resp.business_cover_url = (
                f"/api/v1/businesses/{business.id}/cover"
                if business.cover_data
                else None
            )

        # Populate thumbnail_url for items that lack it (legacy orders fallback)
        items_to_fill = [i for i in resp.items if not i.thumbnail_url and i.product_id]
        if items_to_fill:
            product_ids = [i.product_id for i in items_to_fill]
            img_result = await self.db.execute(
                select(ProductImage).where(
                    ProductImage.product_id.in_(product_ids),
                    ProductImage.position == 1
                )
            )
            thumb_map = {img.product_id: f"/api/v1/product/{img.id}" for img in img_result.scalars().all()}
            for item in resp.items:
                if not item.thumbnail_url and item.product_id in thumb_map:
                    item.thumbnail_url = thumb_map[item.product_id]
        return resp

    async def get_receipt(self, order_id: uuid.UUID) -> dict:
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        items = await self.order_repo.get_order_items(order_id)
        from app.repositories.payment_repository import PaymentRepository
        from app.repositories.business_repository import BusinessRepository
        from app.repositories.customer_repository import CustomerRepository
        payment_repo = PaymentRepository(self.db)
        business_repo = BusinessRepository(self.db)
        customer_repo = CustomerRepository(self.db)
        payment = await payment_repo.get_by_order(order_id)
        business = await business_repo.get_by_id(order.business_id)
        customer = await customer_repo.get_by_id(order.customer_id)
        receipt_data = {
            "order_id": str(order.id),
            "order_number": order.order_number,
            "business_name": business.name if business else "",
            "customer_phone": customer.phone_normalized if customer else "",
            "items": [
                {
                    "product_name": i.product_name,
                    "quantity": i.quantity,
                    "unit_price": float(i.unit_price),
                    "total": float(i.unit_price * i.quantity)
                } for i in items
            ],
            "total_amount": float(order.total_amount),
            "payment_reference": payment.provider_reference if payment else "",
            "payment_time": order.created_at.isoformat() if order.created_at else "",
        }
        import json
        import hashlib
        data_str = json.dumps(receipt_data, sort_keys=True)
        receipt_hash = hashlib.sha256(data_str.encode()).hexdigest()
        receipt_data["receipt_hash"] = receipt_hash
        return receipt_data
