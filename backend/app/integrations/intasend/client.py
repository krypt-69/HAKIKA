import httpx
from app.core.config import settings
import logging

logger = logging.getLogger("hakika.intasend")

class IntaSendClient:
    def __init__(self):
        self.base_url = "https://sandbox.intasend.com"
        self.secret_key = settings.intasend_secret_key
        self.wallet_id = getattr(settings, 'intasend_wallet_id', 'Y74E6JY')

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    def _format_phone(self, phone: str) -> str:
        """Convert to 254XXXXXXXXX format (digits only)."""
        # Remove any +, spaces, or leading 0
        phone = phone.strip().replace('+', '').replace(' ', '')
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        if not phone.startswith('254'):
            phone = '254' + phone
        return phone

    async def send_stk_push(self, phone: str, amount: float, reference: str) -> dict:
        url = f"{self.base_url}/api/v1/payment/mpesa-stk-push/"
        payload = {
            "phone_number": self._format_phone(phone),
            "amount": int(amount),
            "currency": "KES",
            "api_ref": reference,
            "wallet_id": self.wallet_id,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload, headers=self._headers())
            if resp.status_code >= 400:
                raise Exception(f"IntaSend STK Push failed: {resp.text}")
            return resp.json()

    async def check_transaction_status(self, checkout_id: str) -> dict:
        url = f"{self.base_url}/api/v1/payment/status/{checkout_id}/"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=self._headers())
            resp.raise_for_status()
            return resp.json()

    async def send_b2b_payout(
        self,
        amount: float,
        account_number: str,
        account_type: str = "PayBill",
        account_reference: str = "HAKIKA-SETTLEMENT",
        business_name: str = "Business"
    ) -> dict:
        url = f"{self.base_url}/api/v1/send-money/initiate/"
        payload = {
            "currency": "KES",
            "provider": "MPESA-B2B",
            "requires_approval": "NO",
            "transactions": [{
                "name": business_name,
                "account": account_number,
                "account_type": account_type,
                "account_reference": account_reference,
                "amount": float(amount),
                "narrative": "Hakika Settlement"
            }]
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload, headers=self._headers())
            if resp.status_code >= 400:
                raise Exception(f"IntaSend B2B payout failed: {resp.text}")
            return resp.json()
