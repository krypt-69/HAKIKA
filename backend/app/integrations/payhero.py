import httpx
import logging
from app.core.config import settings

logger = logging.getLogger("hakika.payhero")

class PayHeroRegistrationError(Exception):
    """Raised when PayHero channel registration fails."""
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)

async def register_payment_channel(
    channel_type: str,   # "till" or "paybill"
    short_code: str,
    account_number: str,
    description: str,
) -> int:
    """Register a payment channel with PayHero. Returns channel_id (int)."""
    url = f"{settings.payhero_api_base}/payment_channels?is_active=true"
    headers = {
        "Authorization": settings.payhero_auth_token,
        "Content-Type": "application/json",
    }
    payload = {
        "channel_type": channel_type,
        "account_id": settings.payhero_account_id,
        "short_code": short_code,
        "account_number": account_number,
        "description": description,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.error(f"PayHero registration failed: {resp.status_code} {resp.text}")
                raise PayHeroRegistrationError(f"PayHero returned {resp.status_code}")
            data = resp.json()
            channel_id = data.get("id")
            if not channel_id:
                raise PayHeroRegistrationError("PayHero response missing channel id")
            return int(channel_id)
    except httpx.RequestError as e:
        logger.error(f"PayHero request error: {e}")
        raise PayHeroRegistrationError("Could not connect to PayHero")
