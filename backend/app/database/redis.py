import redis.asyncio as redis
from app.core.config import settings

redis_client = redis.from_url(settings.redis_url, decode_responses=True)

async def store_customer_session(customer_id: str, phone: str) -> str:
    import uuid
    token = str(uuid.uuid4())
    key = f"customer_session:{token}"
    await redis_client.hset(key, mapping={
        "customer_id": customer_id,
        "phone": phone
    })
    await redis_client.expire(key, settings.customer_session_expire_hours * 3600)
    return token

async def get_customer_session(token: str) -> dict | None:
    key = f"customer_session:{token}"
    data = await redis_client.hgetall(key)
    if not data:
        return None
    return data
