"""P2 tests: IntaSend callback normalisation + challenge validation."""
from app.payment.providers.intasend_callback import (
    normalise_intasend_callback,
    validate_intasend_challenge,
)


REAL_INTASEND_COMPLETE = {
    "invoice_id": "BRZKGPR",
    "state": "COMPLETE",
    "provider": "MPESA",
    "charges": "0.00",
    "net_amount": "10.36",
    "currency": "KES",
    "value": "10.36",
    "account": "254708374149",
    "api_ref": "test-ref-0001",
    "host": "https://sandbox.intasend.com",
    "failed_reason": None,
    "failed_code": None,
    "challenge": "test-challenge-value",
}


def test_challenge_valid():
    assert validate_intasend_challenge(REAL_INTASEND_COMPLETE, "test-challenge-value") is True


def test_challenge_mismatch():
    assert validate_intasend_challenge(REAL_INTASEND_COMPLETE, "wrong-value") is False


def test_challenge_missing_in_payload():
    p = dict(REAL_INTASEND_COMPLETE)
    p.pop("challenge")
    assert validate_intasend_challenge(p, "test-challenge-value") is False


def test_challenge_unconfigured_server_fails_closed():
    assert validate_intasend_challenge(REAL_INTASEND_COMPLETE, "") is False
    assert validate_intasend_challenge(REAL_INTASEND_COMPLETE, None) is False


def test_normalise_complete():
    n = normalise_intasend_callback(REAL_INTASEND_COMPLETE)
    assert n["state"] == "COMPLETE"
    assert n["api_ref"] == "test-ref-0001"
    assert abs(n["amount"] - 10.36) < 0.01
    assert n["phone"] == "254708374149"
    assert n["provider_reference"] == "BRZKGPR"


def test_normalise_failed():
    p = dict(REAL_INTASEND_COMPLETE)
    p["state"] = "FAILED"
    p["failed_reason"] = "Insufficient funds"
    n = normalise_intasend_callback(p)
    assert n["state"] == "FAILED"


def test_normalise_processing():
    p = dict(REAL_INTASEND_COMPLETE)
    p["state"] = "PROCESSING"
    n = normalise_intasend_callback(p)
    assert n["state"] == "PENDING"


def test_normalise_pending():
    p = dict(REAL_INTASEND_COMPLETE)
    p["state"] = "PENDING"
    n = normalise_intasend_callback(p)
    assert n["state"] == "PENDING"


def test_normalise_unrecognised_state():
    p = dict(REAL_INTASEND_COMPLETE)
    p["state"] = "WEIRD_STATE"
    n = normalise_intasend_callback(p)
    assert n["state"] == "UNRECOGNISED"


def test_normalise_non_dict_input():
    n = normalise_intasend_callback("not a dict")  # type: ignore[arg-type]
    assert n["state"] == "UNRECOGNISED"
