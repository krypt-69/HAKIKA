from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.database.redis import redis_client
from app.core.config import settings
import logging

router = APIRouter()
logger = logging.getLogger("hakika.health")

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    # DB
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    # Redis
    try:
        await redis_client.ping()
        redis_status = "connected"
    except Exception:
        redis_status = "disconnected"

    # Payment provider
    if settings.intasend_mode == "mock":
        intasend_status = "mock"
    else:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    f"{settings.intasend_api_url}/api/v1/wallets/",
                    headers={"Authorization": f"Bearer {settings.intasend_secret_key}"}
                )
                intasend_status = "reachable" if resp.status_code == 200 else "degraded"
        except Exception:
            intasend_status = "unreachable"

    return {
        "status": "ok",
        "database": db_status,
        "redis": redis_status,
        "payment_provider": intasend_status,
    }
