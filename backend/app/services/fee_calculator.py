from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.payment_policy_repository import PaymentPolicyRepository
from app.services.payment_policy_service import PaymentPolicyService
from app.constants.payment_policies import PaymentPolicyKey

async def calculate_processing_fee(db: AsyncSession, amount: float) -> float:
    """Calculate the processing fee for a given amount."""
    repo = PaymentPolicyRepository(db)
    service = PaymentPolicyService(repo)
    commission_pct = await service.get(PaymentPolicyKey.COMMISSION_PERCENTAGE, cast=float)
    fee = round(amount * commission_pct / 100, 2)
    if fee < 1.00:
        fee = 1.00
    return fee

async def calculate_payg_fee(db: AsyncSession, amount: float) -> float:
    """Calculate the PAYG fee (percentage of customer payment)."""
    repo = PaymentPolicyRepository(db)
    service = PaymentPolicyService(repo)
    percentage = await service.get(PaymentPolicyKey.PAYG_FEE_PERCENTAGE, cast=float)
    fee = round(amount * percentage / 100, 2)
    if fee < 1.00:
        fee = 1.00
    return fee
