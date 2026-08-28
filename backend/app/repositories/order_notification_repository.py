from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.order_notification import OrderNotification
import uuid
from datetime import datetime

class OrderNotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_customer_and_order(
        self, customer_id: uuid.UUID, order_id: uuid.UUID
    ) -> OrderNotification | None:
        result = await self.db.execute(
            select(OrderNotification).where(
                OrderNotification.customer_id == customer_id,
                OrderNotification.order_id == order_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_unread_for_customer(self, customer_id: uuid.UUID) -> list[OrderNotification]:
        result = await self.db.execute(
            select(OrderNotification).where(
                OrderNotification.customer_id == customer_id,
                OrderNotification.unread_count > 0,
            )
        )
        return result.scalars().all()

    async def add_or_increment(self, customer_id: uuid.UUID, order_id: uuid.UUID) -> None:
        """Atomically create or increment unread count without committing."""
        from sqlalchemy.dialects.postgresql import insert
        stmt = insert(OrderNotification).values(
            customer_id=customer_id,
            order_id=order_id,
            unread_count=1,
            read_at=None,
            updated_at=datetime.utcnow(),
        )
        stmt = stmt.on_conflict_do_update(
            constraint='uq_order_notifications_customer_order',
            set_={
                'unread_count': OrderNotification.unread_count + 1,
                'updated_at': datetime.utcnow(),
                # read_at intentionally unchanged
            },
        )
        await self.db.execute(stmt)

    async def mark_read(self, notification: OrderNotification) -> None:
        notification.unread_count = 0
        notification.read_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(notification)
