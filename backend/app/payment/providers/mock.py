import uuid
import logging
from typing import Any, Dict, Optional
from .base import PaymentProvider, PaymentProviderContext

logger = logging.getLogger("hakika.payment.mock")

class MockProvider(PaymentProvider):
    def __init__(self):
        self.checkouts = {}

    async def initiate_payment(
        self,
        phone: str,
        amount: float,
        reference: str,
        context: Optional[PaymentProviderContext] = None,
    ) -> Dict[str, Any]:
        checkout_id = f"mock-{uuid.uuid4()}"
        self.checkouts[checkout_id] = {
            "phone": phone,
            "amount": amount,
            "reference": reference,
            "paid": False,
        }
        logger.info(f"Mock STK Push: {checkout_id} for {phone} amount {amount}")
        return {
            "id": checkout_id,
            "phone_number": phone,
            "amount": str(amount),
            "currency": "KES",
            "method": "M-PESA",
            "api_ref": reference,
            "paid": False,
        }

    async def get_payment_status(
        self,
        provider_reference: str,
    ) -> Dict[str, Any]:
        checkout = self.checkouts.get(provider_reference)
        if not checkout:
            raise Exception("Checkout not found")
        return {
            "id": provider_reference,
            "paid": checkout["paid"],
            "amount": checkout["amount"],
            "phone_number": checkout["phone"],
            "reference": checkout["reference"],
        }

    async def initiate_payout(
        self,
        amount: float,
        account_number: str,
        account_type: str,
        account_reference: str,
        business_name: str,
    ) -> Dict[str, Any]:
        logger.info(f"Mock B2B payout: {amount} to {account_number}")
        return {"status": "completed", "reference": f"payout-{uuid.uuid4()}"}

    async def get_payout_status(
        self,
        provider_reference: str,
    ) -> Dict[str, Any]:
        return {"status": "completed", "reference": provider_reference}

    def verify_webhook(
        self,
        payload: bytes,
        signature: Optional[str],
    ) -> bool:
        return True
