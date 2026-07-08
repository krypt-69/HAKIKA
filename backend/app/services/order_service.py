from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.trust_event_repository import TrustEventRepository
from app.models.user import User
from app.models.order import OrderStatus
from app.schemas.order import OrderCreateRequest, OrderResponse, OrderItemResponse
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.product import Product
import uuid

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
        # Normalize phone
        if data.phone.startswith("0"):
            normalized = "+254" + data.phone[1:]
        elif data.phone.startswith("254"):
            normalized = "+" + data.phone
        else:
            normalized = data.phone
        customer = await self.customer_repo.get_or_create(data.phone, normalized)

        # Verify business
        business = await self.business_repo.get_by_id(data.business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")

        # Fetch products for snapshot
        product_ids = [i.product_id for i in data.items]
        result = await self.db.execute(select(Product).where(Product.id.in_(product_ids)))
        products = {p.id: p for p in result.scalars().all()}
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
                'quantity': item.quantity
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
        return self._to_response(order, order_items)

    async def accept_order(self, user: User, order_id: uuid.UUID) -> OrderResponse:
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status != OrderStatus.waiting_acceptance:
            raise HTTPException(status_code=400, detail="Order cannot be accepted in current state")
        business = await self.business_repo.get_by_id(order.business_id)
        if business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        await self.order_repo.update_status(order, OrderStatus.accepted)
        order_items = await self.order_repo.get_order_items(order.id)
        return self._to_response(order, order_items)

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
            await self.order_repo.update_status(order, OrderStatus.cancelled)

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
            await self.order_repo.update_status(order, OrderStatus.cancelled)
        else:
            raise HTTPException(status_code=400)

        order_items = await self.order_repo.get_order_items(order.id)
        return self._to_response(order, order_items)

    async def get_order(self, order_id: uuid.UUID) -> OrderResponse:
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        items = await self.order_repo.get_order_items(order.id)
        return self._to_response(order, items)

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
            res.append(self._to_response(o, items))
        return res

    async def list_orders_for_business(self, user: User) -> list[OrderResponse]:
        businesses = await self.business_repo.get_by_owner(user.id)
        if not businesses:
            return []
        res = []
        for b in businesses:
            orders = await self.order_repo.list_by_business(b.id)
            for o in orders:
                items = await self.order_repo.get_order_items(o.id)
                res.append(self._to_response(o, items))
        return res

    def _to_response(self, order, order_items) -> OrderResponse:
        return OrderResponse(
            id=order.id,
            order_number=order.order_number,
            status=order.status.value,
            subtotal=float(order.subtotal),
            delivery_fee=float(order.delivery_fee),
            total_amount=float(order.total_amount),
            customer_id=order.customer_id,
            business_id=order.business_id,
            items=[OrderItemResponse(
                id=oi.id,
                product_name=oi.product_name,
                unit_price=float(oi.unit_price),
                quantity=oi.quantity,
                product_id=oi.product_id
            ) for oi in order_items],
            created_at=order.created_at
        )
    async def get_receipt(self, order_id: uuid.UUID) -> dict:
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        # Fetch items
        items = await self.order_repo.get_order_items(order_id)
        # Fetch payment
        from app.repositories.payment_repository import PaymentRepository
        payment_repo = PaymentRepository(self.db)
        payment = await payment_repo.get_by_order(order_id)
        # Build receipt data
        receipt_data = {
            "order_id": str(order.id),
            "order_number": order.order_number,
            "business_name": order.business.name if order.business else "",
            "customer_phone": order.customer.phone_normalized if order.customer else "",
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
        # Generate hash (SHA-256) of the receipt data string
        import json
        import hashlib
        data_str = json.dumps(receipt_data, sort_keys=True)
        receipt_hash = hashlib.sha256(data_str.encode()).hexdigest()
        receipt_data["receipt_hash"] = receipt_hash
        return receipt_data
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
