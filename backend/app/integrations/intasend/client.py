import httpx
from app.core.config import settings
import logging

logger = logging.getLogger("hakika.intasend")

class IntaSendClient:
    def __init__(self):
        self.base_url = "https://sandbox.intasend.com"
        self.secret_key = settings.intasend_secret_key

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    async def create_checkout(self, phone: str, amount: float, reference: str) -> dict:
        """Send STK Push. POST /api/v1/payment/mpesa-stk-push/"""
        url = f"{self.base_url}/api/v1/payment/mpesa-stk-push/"
        # Convert phone to international format: 07XX... → 2547XX...
        if phone.startswith("0"):
            phone = "254" + phone[1:]
        elif phone.startswith("+"):
            phone = phone[1:]
        elif not phone.startswith("254"):
            phone = "254" + phone
        payload = {
            "phone_number": phone,
            "amount": int(amount),
            "currency": "KES",
            "api_ref": reference,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload, headers=self._headers())
            logger.info(f"IntaSend STK Push: {resp.status_code} {resp.text}")
            if resp.status_code >= 400:
                raise Exception(f"IntaSend STK Push failed: {resp.text}")
            return resp.json()

    async def check_transaction_status(self, checkout_id: str) -> dict:
        """Check status of a checkout."""
        url = f"{self.base_url}/api/v1/payment/status/{checkout_id}/"
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
