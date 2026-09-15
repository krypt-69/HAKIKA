"""
Pure normalisation for PayHero callbacks.

Real PayHero callback shape (captured 2026-09-15):

{
  "status": true,
  "response": {
    "MerchantRequestID": "...",
    "CheckoutRequestID": "ws_CO_...",
    "ResultCode": 0,
    "Amount": 5,
    "MpesaReceiptNumber": "...",
    "Phone": "2547...",
    "ExternalReference": "...",
    "Status": "Success",
    "ResultDesc": "...",
    "ChannelID": 12661,
    "Fee": 2.9
  },
  "forward_url": ""
}

Internal shape used by the financial transaction path:

{
  "api_ref": "<ExternalReference>",
  "state": "COMPLETE" | "FAILED" | "PENDING" | "UNRECOGNISED",
  "amount": float | None,
  "channel_id": int | None,
  "phone": str | None,
  "provider_reference": str | None,   # CheckoutRequestID
  "merchant_reference": str | None,   # MerchantRequestID
  "mpesa_receipt": str | None,
  "result_code": int | None,
  "raw": dict,
}

The normaliser is idempotent: if the input is already the internal
shape (e.g. from the mock auto-complete or reconcile_pending), it is
returned with the same api_ref / state and no error.
"""
from typing import Any


_INTERNAL_KEYS = {"api_ref", "state"}


def _is_internal_shape(payload: dict) -> bool:
    # Internal shape is recognised when api_ref and state are present
    # and there is no "response" object.
    if "response" in payload:
        return False
    return bool(_INTERNAL_KEYS.intersection(payload.keys()))


def normalise_payhero_callback(payload: dict) -> dict:
    """Return a normalised callback dict.

    Never raises. Unknown shapes return state="UNRECOGNISED" so the
    endpoint can return a non-2xx response.
    """
    if not isinstance(payload, dict):
        return {
            "api_ref": None,
            "state": "UNRECOGNISED",
            "amount": None,
            "channel_id": None,
            "phone": None,
            "provider_reference": None,
            "merchant_reference": None,
            "mpesa_receipt": None,
            "result_code": None,
            "raw": {},
        }

    # Pass-through for internal shape (mock + reconcile_pending)
    if _is_internal_shape(payload):
        return {
            "api_ref": payload.get("api_ref"),
            "state": payload.get("state"),
            "amount": payload.get("amount"),
            "channel_id": payload.get("channel_id"),
            "phone": payload.get("phone"),
            "provider_reference": payload.get("provider_reference"),
            "merchant_reference": payload.get("merchant_reference"),
            "mpesa_receipt": payload.get("mpesa_receipt"),
            "result_code": payload.get("result_code"),
            "raw": payload,
        }

    # Real PayHero shape
    response = payload.get("response") if isinstance(payload.get("response"), dict) else None
    if response is None:
        return {
            "api_ref": payload.get("external_reference"),
            "state": "UNRECOGNISED",
            "amount": None,
            "channel_id": None,
            "phone": None,
            "provider_reference": None,
            "merchant_reference": None,
            "mpesa_receipt": None,
            "result_code": None,
            "raw": payload,
        }

    top_status = payload.get("status")
    result_code = response.get("ResultCode")
    response_status = (response.get("Status") or "").lower()

    if top_status is True and result_code == 0 and response_status == "success":
        state = "COMPLETE"
    elif top_status is False or (isinstance(result_code, int) and result_code != 0):
        state = "FAILED"
    else:
        state = "PENDING"

    return {
        "api_ref": response.get("ExternalReference"),
        "state": state,
        "amount": response.get("Amount"),
        "channel_id": response.get("ChannelID"),
        "phone": response.get("Phone"),
        "provider_reference": response.get("CheckoutRequestID"),
        "merchant_reference": response.get("MerchantRequestID"),
        "mpesa_receipt": response.get("MpesaReceiptNumber"),
        "result_code": result_code,
        "raw": payload,
    }
