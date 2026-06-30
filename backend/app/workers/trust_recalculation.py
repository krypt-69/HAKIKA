import asyncio
from app.database.session import async_session
from app.services.trust_service import TrustService

async def run_trust_recalculation():
    print("Starting trust recalculation...")
    async with async_session() as db:
        service = TrustService(db)
        result = await service.recalculate_all()
        print(result)
    print("Trust recalculation complete.")
