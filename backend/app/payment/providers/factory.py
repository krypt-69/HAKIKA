import logging
from app.core.config import settings
from .base import PaymentProvider
from .mock import MockProvider
from .intasend import IntaSendProvider
from .payhero import PayHeroProvider

logger = logging.getLogger("hakika.payment.factory")

class PaymentProviderFactory:
    @staticmethod
    def create(provider_name: str | None = None) -> PaymentProvider:
        provider = (provider_name or settings.payment_provider).lower()
        logger.info(f"Creating payment provider: {provider}")
        if provider == "mock":
            return MockProvider()
        elif provider == "intasend":
            return IntaSendProvider()
        elif provider == "payhero":
            return PayHeroProvider(settings)
        else:
            raise ValueError(f"Unknown provider: {provider}")

    @staticmethod
    def for_model(payment_model: str) -> PaymentProvider:
        """Return the provider appropriate for a given business payment model."""
        if payment_model == "credit":
            return PaymentProviderFactory.create("payhero")
        elif payment_model == "pay_as_you_go":
            return PaymentProviderFactory.create("intasend")
        else:
            raise ValueError(f"Unknown payment model: {payment_model}")

    @staticmethod
    def by_name(name: str) -> PaymentProvider:
        """Return a provider by its logical name (payhero, intasend, mock)."""
        return PaymentProviderFactory.create(name)
