from app.integrations.intasend.client import IntaSendClient
import logging

logger = logging.getLogger("hakika.intasend.payments")

class IntaSendPayments:
    def __init__(self, client: IntaSendClient = None):
        self.client = client or IntaSendClient()

    async def request_stk_push(self, phone: str, amount: float, reference: str) -> dict:
        """Request a customer payment. Returns the provider response."""
        return await self.client.send_stk_push(phone, amount, reference)

    async def verify_payment(self, checkout_request_id: str) -> dict:
        """Verify a payment by its checkout_request_id."""
        return await self.client.check_transaction_status(checkout_request_id)
