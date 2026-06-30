import httpx
from app.core.config import settings
import logging

logger = logging.getLogger("hakika.intasend")

class IntaSendClient:
    def __init__(self):
        self.base_url = settings.intasend_api_url.rstrip('/')  # https://api.intasend.com
        self.public_key = settings.intasend_public_key
        self.secret_key = settings.intasend_secret_key
        self.test_mode = settings.intasend_test_mode

    def _headers(self) -> dict:
        return {
            "X-IntaSend-Public-API-Key": self.public_key,
            "Content-Type": "application/json",
        }

    async def send_stk_push(self, phone: str, amount: float, reference: str) -> dict:
        """Create a checkout (STK Push). IntaSend API: POST /api/v1/checkout/"""
        url = f"{self.base_url}/api/v1/checkout/"
        payload = {
            "phone_number": phone,
            "amount": str(amount),
            "currency": "KES",
            "method": "M-PESA",
            "api_ref": reference,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload, headers=self._headers())
            logger.info(f"IntaSend Checkout: {resp.status_code} {resp.text}")
            if resp.status_code >= 400:
                raise Exception(f"IntaSend Checkout failed: {resp.text}")
            return resp.json()

    async def check_transaction_status(self, checkout_id: str) -> dict:
        """Check the status of a checkout. GET /api/v1/checkout/{id}/"""
        url = f"{self.base_url}/api/v1/checkout/{checkout_id}/"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=self._headers())
            resp.raise_for_status()
            return resp.json()

    async def send_b2b_payout(self, amount: float, account_number: str,
                              account_type: str = "till") -> dict:
        """B2B payout to business Till/Paybill."""
        url = f"{self.base_url}/api/v1/payouts/b2b/"
        payload = {
            "amount": amount,
            "account_number": account_number,
            "account_type": account_type,
            "currency": "KES",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload, headers=self._headers())
            resp.raise_for_status()
            return resp.json()
