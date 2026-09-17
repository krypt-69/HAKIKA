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
        total_amount: float,
        delivery_note: str | None = None,
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
            delivery_note=delivery_note,
        )
        self.db.add(order)
        await self.db.flush()

        for item in snapshot_items:
            order_item = OrderItem(
                order_id=order.id,
                product_name=item['product_name'],
                unit_price=item['unit_price'],
                quantity=item['quantity'],
                product_id=item['product_id'],
                primary_thumbnail_url=item.get('thumbnail_url')
            )
            self.db.add(order_item)

        # Restore inventory for tracked products in this order
        from app.models.order import OrderItem
        item_result = await self.db.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        for item in item_result.scalars().all():
            if item.product_id is not None:
                await self.db.execute(
                    text("""
                        UPDATE products
                        SET stock_quantity = stock_quantity + :qty
                        WHERE id = :pid
                          AND track_inventory = true
                    """),
                    {"qty": item.quantity, "pid": item.product_id}
                )

        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def create_order_with_items_no_commit(
        self,
        customer_id: uuid.UUID,
        business_id: uuid.UUID,
        snapshot_items: list[dict],
        delivery_coordinates: tuple[float, float],
        subtotal: float,
        delivery_fee: float,
        total_amount: float,
        delivery_note: str | None = None,
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
            delivery_note=delivery_note,
        )
        self.db.add(order)
        await self.db.flush()

        for item in snapshot_items:
            order_item = OrderItem(
                order_id=order.id,
                product_name=item['product_name'],
                unit_price=item['unit_price'],
                quantity=item['quantity'],
                product_id=item['product_id'],
                primary_thumbnail_url=item.get('thumbnail_url')
            )
            self.db.add(order_item)

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

    async def cancel_order_transaction(
        self,
        order_id: uuid.UUID,
        trust_event: dict | None = None,
    ) -> Order:
        from app.models.order_notification_event import OrderNotificationEvent
        from app.models.trust_event import TrustEvent

        result = await self.db.execute(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
        )
        order = result.scalar_one_or_none()
        if not order:
            raise ValueError("Order not found")

        if order.status == OrderStatus.cancelled:
            return order

        next_version = order.status_version + 1
        order.status = OrderStatus.cancelled
        order.status_version = next_version

        if trust_event is not None:
            event = TrustEvent(
                subject_type=trust_event["subject_type"],
                subject_id=trust_event["subject_id"],
                event_type=trust_event["event_type"],
                score_change=trust_event["score_change"],
                reason=trust_event.get("reason"),
            )
            self.db.add(event)

        from sqlalchemy.dialects.postgresql import insert
        stmt = insert(OrderNotificationEvent).values(
            order_id=order.id,
            status_version=next_version,
            created_at=datetime.utcnow(),
        )
        stmt = stmt.on_conflict_do_nothing(
            index_elements=['order_id', 'status_version']
        ).returning(OrderNotificationEvent.id)
        result = await self.db.execute(stmt)
        inserted = result.scalar_one_or_none()

        if inserted:
            from app.repositories.order_notification_repository import OrderNotificationRepository
            on_repo = OrderNotificationRepository(self.db)
            await on_repo.add_or_increment(order.customer_id, order.id)

        # Restore inventory for tracked products in this order
        from app.models.order import OrderItem
        item_result = await self.db.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        for item in item_result.scalars().all():
            if item.product_id is not None:
                await self.db.execute(
                    text("""
                        UPDATE products
                        SET stock_quantity = stock_quantity + :qty
                        WHERE id = :pid
                          AND track_inventory = true
                    """),
                    {"qty": item.quantity, "pid": item.product_id}
                )

        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def report_problem_transaction(
        self,
        order_id: uuid.UUID,
        customer_id: uuid.UUID,
        reason: str,
    ) -> Order:
        from app.models.order_notification_event import OrderNotificationEvent
        from app.models.dispute import Dispute, DisputeStatus
        from app.models.trust_event import TrustEvent

        result = await self.db.execute(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
        )
        order = result.scalar_one_or_none()
        if not order:
            raise ValueError("Order not found")

        if order.status == OrderStatus.dispute_review:
            return order

        # Create dispute
        dispute = Dispute(
            order_id=order.id,
            customer_id=customer_id,
            reason=reason,
            status=DisputeStatus.pending,
        )
        self.db.add(dispute)

        # Create trust event
        trust_event = TrustEvent(
            subject_type="customer",
            subject_id=customer_id,
            event_type="CUSTOMER_REPORTED_PROBLEM",
            score_change=0.0,
            reason=reason,
        )
        self.db.add(trust_event)

        # Transition order
        next_version = order.status_version + 1
        order.status = OrderStatus.dispute_review
        order.status_version = next_version

        # Notification event
        from sqlalchemy.dialects.postgresql import insert
        stmt = insert(OrderNotificationEvent).values(
            order_id=order.id,
            status_version=next_version,
            created_at=datetime.utcnow(),
        )
        stmt = stmt.on_conflict_do_nothing(
            index_elements=['order_id', 'status_version']
        ).returning(OrderNotificationEvent.id)
        result = await self.db.execute(stmt)
        inserted = result.scalar_one_or_none()

        if inserted:
            from app.repositories.order_notification_repository import OrderNotificationRepository
            on_repo = OrderNotificationRepository(self.db)
            await on_repo.add_or_increment(order.customer_id, order.id)

        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def confirm_delivery_transaction(
        self,
        order_id: uuid.UUID,
        customer_id: uuid.UUID,
        trust_event: dict,
    ) -> Order:
        from app.models.order_notification_event import OrderNotificationEvent
        from app.models.trust_event import TrustEvent

        result = await self.db.execute(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
        )
        order = result.scalar_one_or_none()
        if not order:
            raise ValueError("Order not found")

        if order.status == OrderStatus.payment_pending:
            return order

        # Transition 1: arrived → customer_confirmed_delivery
        version1 = order.status_version + 1
        order.status = OrderStatus.customer_confirmed_delivery
        order.status_version = version1

        # Trust event
        te = TrustEvent(
            subject_type=trust_event["subject_type"],
            subject_id=trust_event["subject_id"],
            event_type=trust_event["event_type"],
            score_change=trust_event["score_change"],
            reason=trust_event.get("reason"),
        )
        self.db.add(te)

        # Notification event 1
        from sqlalchemy.dialects.postgresql import insert
        # Event 1
        stmt1 = insert(OrderNotificationEvent).values(
            order_id=order.id,
            status_version=version1,
            created_at=datetime.utcnow(),
        )
        stmt1 = stmt1.on_conflict_do_nothing(index_elements=['order_id', 'status_version']).returning(OrderNotificationEvent.id)
        result1 = await self.db.execute(stmt1)
        inserted1 = result1.scalar_one_or_none()

        # Transition 2
        version2 = version1 + 1
        order.status = OrderStatus.payment_pending
        order.status_version = version2

        # Event 2
        stmt2 = insert(OrderNotificationEvent).values(
            order_id=order.id,
            status_version=version2,
            created_at=datetime.utcnow(),
        )
        stmt2 = stmt2.on_conflict_do_nothing(index_elements=['order_id', 'status_version']).returning(OrderNotificationEvent.id)
        result2 = await self.db.execute(stmt2)
        inserted2 = result2.scalar_one_or_none()

        from app.repositories.order_notification_repository import OrderNotificationRepository
        on_repo = OrderNotificationRepository(self.db)

        increment = 0
        if inserted1:
            increment += 1
        if inserted2:
            increment += 1

        if increment > 0:
            for _ in range(increment):
                await on_repo.add_or_increment(order.customer_id, order.id)

        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def assign_order_transaction(
        self,
        order_id: uuid.UUID,
    ) -> Order:
        from app.models.order_notification_event import OrderNotificationEvent

        result = await self.db.execute(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
        )
        order = result.scalar_one_or_none()
        if not order:
            raise ValueError("Order not found")

        if order.status == OrderStatus.out_for_delivery:
            return order

        next_version = order.status_version + 1
        order.status = OrderStatus.out_for_delivery
        order.status_version = next_version

        from sqlalchemy.dialects.postgresql import insert
        stmt = insert(OrderNotificationEvent).values(
            order_id=order.id,
            status_version=next_version,
            created_at=datetime.utcnow(),
        )
        stmt = stmt.on_conflict_do_nothing(index_elements=['order_id', 'status_version']).returning(OrderNotificationEvent.id)
        result = await self.db.execute(stmt)
        inserted = result.scalar_one_or_none()

        if inserted:
            from app.repositories.order_notification_repository import OrderNotificationRepository
            on_repo = OrderNotificationRepository(self.db)
            await on_repo.add_or_increment(order.customer_id, order.id)

        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def arrive_order_transaction(
        self,
        order_id: uuid.UUID,
    ) -> Order:
        from app.models.order_notification_event import OrderNotificationEvent

        result = await self.db.execute(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
        )
        order = result.scalar_one_or_none()
        if not order:
            raise ValueError("Order not found")

        if order.status == OrderStatus.arrived:
            return order

        next_version = order.status_version + 1
        order.status = OrderStatus.arrived
        order.status_version = next_version

        from sqlalchemy.dialects.postgresql import insert
        stmt = insert(OrderNotificationEvent).values(
            order_id=order.id,
            status_version=next_version,
            created_at=datetime.utcnow(),
        )
        stmt = stmt.on_conflict_do_nothing(index_elements=['order_id', 'status_version']).returning(OrderNotificationEvent.id)
        result = await self.db.execute(stmt)
        inserted = result.scalar_one_or_none()

        if inserted:
            from app.repositories.order_notification_repository import OrderNotificationRepository
            on_repo = OrderNotificationRepository(self.db)
            await on_repo.add_or_increment(order.customer_id, order.id)

        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def transition_status(
        self,
        order_id: uuid.UUID,
        new_status: OrderStatus,
        visible_to_customer: bool = False,
    ) -> Order:
        """
        Atomically transition an order to new_status, incrementing status_version.

        The database row is the source of truth. The caller must pass the
        desired new_status, not the previous status. For customer-visible
        transitions, creates an OrderNotificationEvent with the newly assigned
        status_version.

        Locking prevents two concurrent transitions from producing the same
        version or event.
        """
        from app.models.order_notification_event import OrderNotificationEvent

        # Lock the order row for update
        result = await self.db.execute(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
        )
        order = result.scalar_one_or_none()
        if not order:
            raise ValueError("Order not found")

        # Authoritative current status — reject if already at new_status
        if order.status == new_status:
            return order

        # Version from DB state, not caller
        next_version = order.status_version + 1
        order.status = new_status
        order.status_version = next_version

        if visible_to_customer:
            from sqlalchemy.dialects.postgresql import insert
            stmt = insert(OrderNotificationEvent).values(
                order_id=order.id,
                status_version=next_version,
                created_at=datetime.utcnow(),
            )
            stmt = stmt.on_conflict_do_nothing(
                index_elements=['order_id', 'status_version']
            ).returning(OrderNotificationEvent.id)
            result = await self.db.execute(stmt)
            inserted = result.scalar_one_or_none()

            if inserted:
                from app.repositories.order_notification_repository import OrderNotificationRepository
                on_repo = OrderNotificationRepository(self.db)
                await on_repo.add_or_increment(order.customer_id, order.id)

        await self.db.commit()
        await self.db.refresh(order)
        return order

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
