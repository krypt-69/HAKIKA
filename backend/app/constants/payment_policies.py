from enum import StrEnum

class PaymentPolicyKey(StrEnum):
    COMMISSION_PERCENTAGE = "commission_percentage"
    PAYG_FEE_PERCENTAGE = "payg_fee_percentage"
    TRIAL_ENABLED = "trial_enabled"
    TRIAL_CREDIT = "trial_credit"
    TRIAL_VOLUME = "trial_volume"
    DEDUCTION_STAGE = "deduction_stage"
