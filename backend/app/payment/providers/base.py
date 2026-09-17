from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from dataclasses import dataclass

@dataclass
class PaymentProviderContext:
    channel_id: Optional[int] = None
    callback_url: Optional[str] = None

class PaymentProvider(ABC):
    @abstractmethod
    async def initiate_payment(
        self,
        phone: str,
        amount: float,
        reference: str,
        context: Optional[PaymentProviderContext] = None,
    ) -> Dict[str, Any]:
        """Initiate a payment (STK Push). Returns a provider reference (checkout_id)."""
        ...

    @abstractmethod
    async def get_payment_status(
        self,
        provider_reference: str,
    ) -> Dict[str, Any]:
        """Get status of a payment by provider reference."""
        ...

    @abstractmethod
    async def initiate_payout(
        self,
        amount: float,
        account_number: str,
        account_type: str,
        account_reference: str,
        business_name: str,
    ) -> Dict[str, Any]:
        """Initiate a payout to a merchant. Returns provider reference."""
        ...

    @abstractmethod
    async def get_payout_status(
        self,
        provider_reference: str,
    ) -> Dict[str, Any]:
        """Get status of a payout by provider reference."""
        ...

    @abstractmethod
    def verify_webhook(
        self,
        payload: bytes,
        signature: Optional[str],
    ) -> bool:
        """Verify webhook signature."""
        ...
