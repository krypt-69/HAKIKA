import hmac
import hashlib
from app.core.config import settings

def verify_signature(payload: bytes, signature_header: str | None) -> bool:
    """
    Verify the IntaSend webhook signature.
    Returns True if the signature is valid, False otherwise.
    """
    if not settings.intasend_webhook_secret:
        # In sandbox without webhook secret configured, skip verification
        return True

    if not signature_header:
        return False

    expected = hmac.new(
        settings.intasend_webhook_secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, signature_header)
