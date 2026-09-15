"""
P1 tests for PayHero callback recovery and safety.

Canonical fixture: real PayHero callback captured 2026-09-15:
  payload.response.ExternalReference   -> Hakika idempotency_key
  payload.response.CheckoutRequestID   -> stored in payment.provider_specific_data
  payload.status=True, ResultCode=0, Status="Success" -> COMPLETE

These tests exercise the normaliser only. They do not require a live
provider, database, or running server. They prove the callback shape
and status detection logic introduced in P1.
"""
import pytest

from app.payment.providers.payhero_callback import normalise_payhero_callback


REAL_PAYHERO_SUCCESS = {
    "status": True,
    "response": {
        "MerchantRequestID": "b01e-4ed4-b070-9040862c3e7d2227797",
        "CheckoutRequestID": "ws_CO_15092026143202881715982985",
        "ResultCode": 0,
        "Amount": 5,
        "MpesaReceiptNumber": "UIF856WIPF",
        "Phone": "254715982985",
        "ExternalReference": "83554790-4ccd-4065-ac5c-b7dcc9c8f02a",
        "Status": "Success",
        "ResultDesc": "The service request is processed successfully.",
        "ServiceWalletBalance": 0,
        "PaymentWalletBalance": 0,
        "ChannelID": 12661,
        "Fee": 2.9,
    },
    "forward_url": "",
}

REAL_PAYHERO_FAILURE = {
    "status": False,
    "response": {
        "MerchantRequestID": "b01e-4ed4-b070-9040862c3e7d2227797",
        "CheckoutRequestID": "ws_CO_15092026143202881715982985",
        "ResultCode": 1032,
        "Amount": 5,
        "MpesaReceiptNumber": "",
        "Phone": "254715982985",
        "ExternalReference": "83554790-4ccd-4065-ac5c-b7dcc9c8f02a",
        "Status": "Failed",
        "ResultDesc": "Request cancelled by user.",
        "ChannelID": 12661,
    },
    "forward_url": "",
}

INTERNAL_MOCK_SUCCESS = {
    "api_ref": "83554790-4ccd-4065-ac5c-b7dcc9c8f02a",
    "state": "COMPLETE",
}


def test_normalise_real_payhero_success():
    n = normalise_payhero_callback(REAL_PAYHERO_SUCCESS)
    assert n["state"] == "COMPLETE"
    assert n["api_ref"] == "83554790-4ccd-4065-ac5c-b7dcc9c8f02a"
    assert n["amount"] == 5
    assert n["channel_id"] == 12661
    assert n["phone"] == "254715982985"
    assert n["provider_reference"] == "ws_CO_15092026143202881715982985"
    assert n["merchant_reference"] == "b01e-4ed4-b070-9040862c3e7d2227797"
    assert n["mpesa_receipt"] == "UIF856WIPF"
    assert n["result_code"] == 0


def test_normalise_real_payhero_failure():
    n = normalise_payhero_callback(REAL_PAYHERO_FAILURE)
    assert n["state"] == "FAILED"
    assert n["api_ref"] == "83554790-4ccd-4065-ac5c-b7dcc9c8f02a"
    assert n["result_code"] == 1032


def test_normalise_internal_shape_passthrough():
    n = normalise_payhero_callback(INTERNAL_MOCK_SUCCESS)
    assert n["state"] == "COMPLETE"
    assert n["api_ref"] == "83554790-4ccd-4065-ac5c-b7dcc9c8f02a"


def test_normalise_malformed_empty_dict():
    n = normalise_payhero_callback({})
    assert n["state"] == "UNRECOGNISED"
    assert n["api_ref"] is None


def test_normalise_malformed_missing_response():
    n = normalise_payhero_callback({"status": True})
    assert n["state"] == "UNRECOGNISED"


def test_normalise_non_dict_input():
    n = normalise_payhero_callback("not a dict")  # type: ignore[arg-type]
    assert n["state"] == "UNRECOGNISED"


def test_normalise_result_code_nonzero_is_failed():
    """PayHero convention: any non-zero ResultCode means the transaction failed."""
    payload = {
        "status": True,
        "response": {
            "ResultCode": 1,
            "Status": "Processing",
            "ExternalReference": "ref-1",
            "Amount": 10,
            "ChannelID": 1,
            "Phone": "254700000000",
            "CheckoutRequestID": "ws_1",
            "MerchantRequestID": "mr_1",
            "MpesaReceiptNumber": "",
        },
    }
    n = normalise_payhero_callback(payload)
    assert n["state"] == "FAILED"


def test_normalise_pending_when_result_code_absent():
    """Defensive pending case: no result code yet, no explicit failure."""
    payload = {
        "status": True,
        "response": {
            "ExternalReference": "ref-2",
            "Amount": 10,
            "ChannelID": 1,
            "Phone": "254700000000",
            "CheckoutRequestID": "ws_2",
            "MerchantRequestID": "mr_2",
            "MpesaReceiptNumber": "",
        },
    }
    n = normalise_payhero_callback(payload)
    assert n["state"] == "PENDING"


def test_normalise_correlation_fields_present_even_when_failed():
    n = normalise_payhero_callback(REAL_PAYHERO_FAILURE)
    # correlation must still be extracted for failure callbacks
    assert n["provider_reference"] == "ws_CO_15092026143202881715982985"
    assert n["merchant_reference"] == "b01e-4ed4-b070-9040862c3e7d2227797"

# ---------------------------------------------------------------
# DEF-P1-A: phone canonicalisation must match across +254/254 forms
# ---------------------------------------------------------------

def _canon_phone(v):
    s = str(v).strip().replace("+", "").replace(" ", "")
    if s.startswith("0"):
        s = "254" + s[1:]
    if not s.startswith("254"):
        s = "254" + s
    return s


def test_phone_canonicalisation_matches_plus_vs_no_plus():
    # Stored is +254..., callback is 254... — must be equal after canonicalisation
    assert _canon_phone("+254715982985") == _canon_phone("254715982985")
    assert _canon_phone("+254715982985") == "254715982985"


def test_phone_canonicalisation_rejects_different_numbers():
    assert _canon_phone("+254715982985") != _canon_phone("254700000000")


def test_phone_canonicalisation_handles_leading_zero():
    assert _canon_phone("0715982985") == "254715982985"
