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
    ) -> Dict[str, Any]:
        return await self.client.send_b2b_payout(
            amount=amount,
            account_number=account_number,
            account_type=account_type,
            account_reference=account_reference,
            business_name=business_name,
        )

    async def get_payout_status(
        self,
        provider_reference: str,
    ) -> Dict[str, Any]:
        logger.warning("Payout status not implemented for IntaSend")
        return {"status": "pending", "reference": provider_reference}

    def verify_webhook(
        self,
        payload: bytes,
        signature: Optional[str],
    ) -> bool:
        from app.integrations.intasend.webhook import verify_signature
        return verify_signature(payload, signature)
