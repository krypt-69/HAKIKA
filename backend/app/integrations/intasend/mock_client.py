import uuid
import logging

logger = logging.getLogger("hakika.intasend.mock")

class MockIntaSendClient:
    def __init__(self):
        self.checkouts = {}

    async def send_stk_push(self, phone: str, amount: float, reference: str) -> dict:
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

    async def check_transaction_status(self, checkout_id: str) -> dict:
        checkout = self.checkouts.get(checkout_id)
        if not checkout:
            raise Exception("Checkout not found")
        return {
            "id": checkout_id,
            "paid": checkout["paid"],
            "amount": checkout["amount"],
            "phone_number": checkout["phone"],
        }

    async def send_b2b_payout(self, amount: float, account_number: str,
                              account_type: str = "till") -> dict:
        logger.info(f"Mock B2B payout: {amount} to {account_number}")
        return {"status": "completed", "reference": f"payout-{uuid.uuid4()}"}

    def get_reference(self, checkout_id: str) -> str | None:
        """Return the original reference (idempotency_key) stored for a mock checkout."""
        checkout = self.checkouts.get(checkout_id)
        if checkout:
            return checkout["reference"]
        return None

    def mark_paid(self, checkout_id: str):
        if checkout_id in self.checkouts:
            self.checkouts[checkout_id]["paid"] = True
            return True
        return False

mock_instance = MockIntaSendClient()
