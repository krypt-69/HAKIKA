from app.integrations.intasend.client import IntaSendClient
import logging

logger = logging.getLogger("hakika.intasend.payments")

class IntaSendPayments:
    def __init__(self, client: IntaSendClient = None):
        self.client = client or IntaSendClient()

    async def request_stk_push(self, phone: str, amount: float, reference: str) -> dict:
        return await self.client.create_checkout(phone, amount, reference)

    async def verify_payment(self, checkout_id: str) -> dict:
        return await self.client.check_transaction_status(checkout_id)
