import httpx
import logging
import hmac
import hashlib
from typing import Any, Dict, Optional
from .base import PaymentProvider, PaymentProviderContext
from app.core.config import settings

logger = logging.getLogger("hakika.payment.payhero")

class PayHeroProvider(PaymentProvider):
    def __init__(self, config):
        self.api_base = config.payhero_api_base
        self.stk_base = config.payhero_stk_base
        self.use_mock_stk = config.payhero_use_mock_stk
        self.auth_token = config.payhero_auth_token
        self.account_id = config.payhero_account_id
        self.webhook_secret = config.payhero_webhook_secret
        self.test_result = config.payhero_test_result
        self.timeout = 30

        logger.info(
            f"PayHero mode={'mock' if self.use_mock_stk else 'real'} "
            f"api_base={self.api_base} stk_base={self.stk_base}"
        )

    def _payment_base(self) -> str:
        return self.stk_base if self.use_mock_stk else self.api_base

    def _headers(self) -> dict:
        return {
            "Authorization": self.auth_token,
            "Content-Type": "application/json",
        }

    def _format_phone(self, phone: str) -> str:
        phone = phone.strip().replace('+', '').replace(' ', '')
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        if not phone.startswith('254'):
            phone = '254' + phone
        return phone

    async def initiate_payment(
        self,
        phone: str,
        amount: float,
        reference: str,
        context: Optional[PaymentProviderContext] = None,
    ) -> Dict[str, Any]:
        if not context or not context.channel_id:
            raise ValueError("channel_id is required for PayHero provider")

        payload = {
            "amount": int(amount),
            "phone_number": self._format_phone(phone),
            "channel_id": context.channel_id,
            "provider": "m-pesa",
            "external_reference": reference,
            "callback_url": settings.payhero_callback_url if hasattr(settings, "payhero_callback_url") else "http://localhost:8000/api/v1/payments/callback",
        }
        url = f"{self._payment_base()}/payments"
        headers = self._headers()
        # For mock mode, allow test override of callback result
        if self.use_mock_stk:
            headers["X-Mock-Result"] = self.test_result

        masked_auth = headers["Authorization"][:20] + "..." + headers["Authorization"][-10:] if headers["Authorization"] else "MISSING"
        logger.info(f"PayHero request: POST {url}")
        logger.info(f"PayHero request headers: Authorization={masked_auth}, Content-Type={headers['Content-Type']}")
        logger.info(f"PayHero request payload: {payload}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
            logger.info(f"PayHero response: status={resp.status_code}, body={resp.text}")

            if resp.status_code >= 400:
                raise Exception(f"PayHero STK Push failed: {resp.text}")
            data = resp.json()
            if not data.get("success"):
                raise Exception(f"PayHero STK Push failed: {data}")
            return {"id": data.get("reference") or data.get("CheckoutRequestID")}

    async def get_payment_status(
        self,
        provider_reference: str,
    ) -> Dict[str, Any]:
        url = f"{self._payment_base()}/transaction-status?reference={provider_reference}"
        headers = self._headers()
        # For mock mode, allow test override of callback result
        if self.use_mock_stk:
            headers["X-Mock-Result"] = self.test_result
        masked_auth = headers["Authorization"][:20] + "..." + headers["Authorization"][-10:] if headers["Authorization"] else "MISSING"
        logger.info(f"PayHero status request: GET {url}, Authorization={masked_auth}")
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, headers=headers)
            logger.info(f"PayHero status response: status={resp.status_code}, body={resp.text}")
            resp.raise_for_status()
            data = resp.json()
            return {
                "status": data.get("status"),
                "amount": data.get("amount"),
                "phone": data.get("phone"),
                "reference": data.get("reference"),
                "provider_reference": data.get("provider_reference"),
            }

    async def initiate_payout(
        self,
        amount: float,
        account_number: str,
        account_type: str,
        account_reference: str,
        business_name: str,
    ) -> Dict[str, Any]:
        # Use real API base for payouts
        url = f"{self.api_base}/send-money/initiate/"
        # ... existing logic (unchanged)

    async def get_payout_status(
        self,
        provider_reference: str,
    ) -> Dict[str, Any]:
        raise NotImplementedError("PayHero payout status not yet implemented")

    def verify_webhook(
        self,
        payload: bytes,
        signature: Optional[str],
    ) -> bool:
        if not self.webhook_secret:
            return True
        if not signature:
            return False
        expected = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
