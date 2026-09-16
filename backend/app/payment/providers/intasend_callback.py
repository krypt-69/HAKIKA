"""IntaSend callback normalisation and fail-closed challenge validation."""
from typing import Any

_STATE_COMPLETE = "COMPLETE"
_STATE_FAILED = "FAILED"
_STATE_PENDING = "PENDING"
_STATE_UNRECOGNISED = "UNRECOGNISED"


def validate_intasend_challenge(payload: dict, configured_challenge: str | None) -> bool:
    """Fail-closed: no configured challenge -> reject. Missing payload challenge -> reject."""
    if not configured_challenge:
        return False
    if not isinstance(payload, dict):
        return False
    incoming = payload.get("challenge")
    if incoming is None:
        return False
    return str(incoming) == str(configured_challenge)


def normalise_intasend_callback(payload: dict) -> dict:
    if not isinstance(payload, dict):
        return {
            "api_ref": None,
            "state": _STATE_UNRECOGNISED,
            "amount": None,
            "channel_id": None,
            "phone": None,
            "provider_reference": None,
            "merchant_reference": None,
            "mpesa_receipt": None,
            "result_code": None,
            "raw": {},
            "invoice_id": None,
        }

    raw_state = (payload.get("state") or "").upper()
    if raw_state == "COMPLETE":
        state = _STATE_COMPLETE
    elif raw_state in ("FAILED", "REVERSED"):
        state = _STATE_FAILED
    elif raw_state in ("PENDING", "PROCESSING"):
        state = _STATE_PENDING
    else:
        state = _STATE_UNRECOGNISED

    amount_raw = payload.get("value") or payload.get("net_amount")
    try:
        amount = float(amount_raw) if amount_raw is not None else None
    except (TypeError, ValueError):
        amount = None

    return {
        "api_ref": payload.get("api_ref"),
        "state": state,
        "amount": amount,
        "channel_id": None,
        "phone": payload.get("account"),
        "provider_reference": payload.get("invoice_id"),
        "merchant_reference": None,
        "mpesa_receipt": None,
        "result_code": None,
        "raw": payload,
        "invoice_id": payload.get("invoice_id"),
    }
