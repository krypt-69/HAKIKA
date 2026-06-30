import hmac
import hashlib
import json
from app.core.config import settings
import logging

logger = logging.getLogger("hakika.intasend.webhook")

def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """Verify that the webhook request came from IntaSend."""
    if not settings.intasend_webhook_secret:
        logger.warning("No webhook secret configured, skipping signature verification")
        return True
    expected = hmac.new(
        settings.intasend_webhook_secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
