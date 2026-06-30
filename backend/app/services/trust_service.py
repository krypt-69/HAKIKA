from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.trust_event import TrustEvent
from app.models.business import Business
from app.models.customer import Customer

class TrustService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def recalculate_all(self):
        # Recalculate business trust
        business_scores = await self.db.execute(
            select(TrustEvent.subject_id, func.sum(TrustEvent.score_change))
            .where(TrustEvent.subject_type == 'business')
            .group_by(TrustEvent.subject_id)
        )
        for row in business_scores:
            business_id, score_change = row
            new_score = max(0, min(100, 80 + float(score_change or 0)))
            await self.db.execute(
                Business.__table__.update().where(Business.id == business_id).values(trust_score=new_score)
            )

        # Recalculate customer trust
        customer_scores = await self.db.execute(
            select(TrustEvent.subject_id, func.sum(TrustEvent.score_change))
            .where(TrustEvent.subject_type == 'customer')
            .group_by(TrustEvent.subject_id)
        )
        for row in customer_scores:
            customer_id, score_change = row
            new_score = max(0, min(100, 100 + float(score_change or 0)))
            await self.db.execute(
                Customer.__table__.update().where(Customer.id == customer_id).values(trust_score=new_score)
            )
        await self.db.commit()
        return {"status": "completed"}
