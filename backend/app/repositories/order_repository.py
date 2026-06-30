from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.order import Order, OrderItem, OrderStatus
from datetime import datetime
import uuid

class OrderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_order_number(self) -> str:
        seq = await self.db.execute(text("SELECT nextval('order_number_seq')"))
        num = seq.scalar()
        return f"HK-{num:06d}"

    async def create_order_with_items(
        self,
        customer_id: uuid.UUID,
        business_id: uuid.UUID,
        snapshot_items: list[dict],
        delivery_coordinates: tuple[float, float],
        subtotal: float,
        delivery_fee: float,
        total_amount: float
    ) -> Order:
        order_number = await self.generate_order_number()
        order = Order(
            order_number=order_number,
            customer_id=customer_id,
            business_id=business_id,
            status=OrderStatus.waiting_acceptance,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total_amount=total_amount,
            delivery_coordinates=f'SRID=4326;POINT({delivery_coordinates[1]} {delivery_coordinates[0]})',
        )
        self.db.add(order)
        await self.db.flush()

        for item in snapshot_items:
            order_item = OrderItem(
                order_id=order.id,
                product_name=item['product_name'],
                unit_price=item['unit_price'],
                quantity=item['quantity'],
                product_id=item['product_id']
            )
            self.db.add(order_item)

        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def get_by_id(self, order_id: uuid.UUID) -> Order | None:
        result = await self.db.execute(select(Order).where(Order.id == order_id))
        return result.scalar_one_or_none()

    async def get_order_items(self, order_id: uuid.UUID) -> list[OrderItem]:
        result = await self.db.execute(select(OrderItem).where(OrderItem.order_id == order_id))
        return result.scalars().all()

    async def update_status(self, order: Order, new_status: OrderStatus):
        order.status = new_status
        await self.db.commit()
        await self.db.refresh(order)

    async def list_by_business(self, business_id: uuid.UUID, status_filter: list[OrderStatus] | None = None) -> list[Order]:
        query = select(Order).where(Order.business_id == business_id)
        if status_filter:
            query = query.where(Order.status.in_(status_filter))
        result = await self.db.execute(query.order_by(Order.created_at.desc()))
        return result.scalars().all()

    async def list_by_customer(self, customer_id: uuid.UUID) -> list[Order]:
        result = await self.db.execute(
            select(Order).where(Order.customer_id == customer_id).order_by(Order.created_at.desc())
        )
        return result.scalars().all()
