import logging
from typing import Any, Dict, Optional
from .base import PaymentProvider, PaymentProviderContext
from app.integrations.intasend.payments import IntaSendPayments

logger = logging.getLogger("hakika.payment.intasend")

class IntaSendProvider(PaymentProvider):
    def __init__(self):
        self.client = IntaSendPayments()

    async def initiate_payment(
        self,
        phone: str,
        amount: float,
        reference: str,
        context: Optional[PaymentProviderContext] = None,
    ) -> Dict[str, Any]:
        return await self.client.send_stk_push(phone, amount, reference)

    async def get_payment_status(
        self,
        provider_reference: str,
    ) -> Dict[str, Any]:
        return await self.client.verify_payment(provider_reference)

    async def initiate_payout(
        self,
        amount: float,
        account_number: str,
        account_type: str,
        account_reference: str,
        business_name: str,
        payout_reference: str | None = None,
    ) -> Dict[str, Any]:
        return await self.client.send_b2b_payout(
            amount=amount,
            account_number=account_number,
            account_type=account_type,
            account_reference=account_reference,
            business_name=business_name,
            payout_reference=payout_reference,
        )

    async def get_wallet_balance(self) -> dict:
        """Return the current wallet balance for this provider."""
        return await self.client.get_wallet_balance()

    async def get_payout_status(
        self,
        provider_reference: str,
    ) -> Dict[str, Any]:
        data = await self.client.get_b2b_payout_status(provider_reference)
        if data.get("status") == "unknown":
            return {"status": "unknown", "reference": provider_reference}
        # inspect the first item's status, not just batch status
        txns = data.get("transactions") or []
        if not txns:
            return {"status": "unknown", "reference": provider_reference}
        code = txns[0].get("status_code") or data.get("status_code")
        if code in ("TS100",):
            return {"status": "completed", "reference": provider_reference}
        if code in ("TF106", "TF103", "BF102", "BF105", "BF107", "TC108", "BE111"):
            return {"status": "failed", "reference": provider_reference}
        if code == "TF105":
            return {"status": "unknown", "reference": provider_reference}
        return {"status": "processing", "reference": provider_reference}

    def verify_webhook(
        self,
        payload: bytes,
        signature: Optional[str],
    ) -> bool:
        from app.integrations.intasend.webhook import verify_signature
        return verify_signature(payload, signature)
