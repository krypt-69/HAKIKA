import httpx
from app.core.config import settings
import base64

class IntaSendClient:
    def __init__(self):
        self.base_url = settings.intasend_api_url
        self.public_key = settings.intasend_public_key
        self.secret_key = settings.intasend_secret_key
        self.auth = base64.b64encode(f"{self.public_key}:{self.secret_key}".encode()).decode()

    async def send_stk_push(self, phone: str, amount: float, reference: str) -> dict:
        url = f"{self.base_url}/payment/stk-push/"
        headers = {
            "Authorization": f"Bearer {self.auth}",
            "Content-Type": "application/json"
        }
        payload = {
            "phone_number": phone,
            "amount": amount,
            "reference": reference
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            return response.json()

    async def check_transaction_status(self, checkout_request_id: str) -> dict:
        url = f"{self.base_url}/payment/status/{checkout_request_id}/"
        headers = {"Authorization": f"Bearer {self.auth}"}
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            return response.json()
