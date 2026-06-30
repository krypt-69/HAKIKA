from app.integrations.intasend.client import IntaSendClient
import logging

logger = logging.getLogger("hakika.intasend.payouts")

class IntaSendPayouts:
    def __init__(self, client: IntaSendClient = None):
        self.client = client or IntaSendClient()

    async def send_to_business(self, amount: float, account_number: str,
                               account_type: str = "till") -> dict:
        """Send money to a business account."""
        return await self.client.send_b2b_payout(amount, account_number, account_type)
