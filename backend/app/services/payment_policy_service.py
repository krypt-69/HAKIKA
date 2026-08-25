from typing import Any, Callable, TypeVar
from app.repositories.payment_policy_repository import PaymentPolicyRepository
from app.constants.payment_policies import PaymentPolicyKey

T = TypeVar("T")

DEFAULT_POLICIES: dict[str, Any] = {
    PaymentPolicyKey.COMMISSION_PERCENTAGE: 8.0,
    PaymentPolicyKey.TRIAL_ENABLED: True,
    PaymentPolicyKey.TRIAL_CREDIT: 2000.0,
    PaymentPolicyKey.DEDUCTION_STAGE: "payment_callback",
}

class PaymentPolicyService:
    def __init__(self, repo: PaymentPolicyRepository):
        self.repo = repo

    async def get(
        self,
        key: PaymentPolicyKey,
        cast: Callable[[str], T] | None = None,
    ) -> Any:
        policy = await self.repo.get(key)
        if policy is not None:
            value = policy.value
        elif key in DEFAULT_POLICIES:
            value = DEFAULT_POLICIES[key]
        else:
            raise KeyError(f"Unknown payment policy: {key}")

        if cast is not None:
            try:
                return cast(value)
            except Exception as exc:
                raise ValueError(f"Unable to cast payment policy '{key}'") from exc
        return value
