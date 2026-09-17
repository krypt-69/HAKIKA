import os
from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator

class Settings(BaseSettings):
    # Payment provider selection
    payment_provider: str = os.getenv("PAYMENT_PROVIDER", "mock")  # mock, intasend, payhero

    # App
    app_env: str = "development"

    # Database
    database_url: str = "postgresql+asyncpg://hakika:hakika_dev@localhost:5432/hakika_db"
    database_url_sync: str = "postgresql+psycopg2://hakika:hakika_dev@localhost:5432/hakika_db"
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    jwt_secret_key: str = "change-me"
    jwt_refresh_secret_key: str = "change-me"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    customer_session_expire_hours: int = 24

    # IntaSend (legacy)
    intasend_mode: str = "mock"  # mock or real
    intasend_api_url: str = "https://sandbox.intasend.com"
    intasend_public_key: str = ""
    intasend_secret_key: str = ""
    intasend_wallet_id: str = os.getenv("INTASEND_WALLET_ID", "")
    intasend_webhook_secret: str = ""
    intasend_challenge: str = os.getenv("INTASEND_CHALLENGE", "")

    # PayHero
    payhero_base_url: str = os.getenv("PAYHERO_BASE_URL", "https://backend.payhero.co.ke/api/v2")
    payhero_auth_token: str = os.getenv("PAYHERO_AUTH_TOKEN", "").strip()
    payhero_account_id: int = int(os.getenv("PAYHERO_ACCOUNT_ID", "0"))
    payhero_collection_channel_id: int | None = None

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        v = os.getenv("PAYHERO_COLLECTION_CHANNEL_ID")
        if v:
            self.payhero_collection_channel_id = int(v)
    payhero_webhook_secret: str = os.getenv("PAYHERO_WEBHOOK_SECRET", "")
    payhero_callback_url: str = os.getenv("PAYHERO_CALLBACK_URL", "http://localhost:8000/api/v1/payments/callback")
    payhero_credit_callback_url: str = os.getenv("PAYHERO_CREDIT_CALLBACK_URL", "http://localhost:8000/api/v1/credit/callback")

    # PayHero STK Simulator (for development)
    payhero_api_base: str = os.getenv("PAYHERO_API_BASE", "https://backend.payhero.co.ke/api/v2")
    _stk_base: str = os.getenv("PAYHERO_STK_BASE", "").strip()
    payhero_stk_base: str = _stk_base or payhero_api_base
    payhero_use_mock_stk: bool = os.getenv("PAYHERO_USE_MOCK_STK", "false").lower() == "true"
    payhero_test_result: str = os.getenv("PAYHERO_TEST_RESULT", "success")   # <-- properly indented

    # External services
    sentry_dsn: str = ""
    r2_access_key: str = ""
    r2_secret_key: str = ""
    r2_bucket: str = "hakika-dev"

    class Config:
        env_file = ".env"
        extra = "allow"

    @model_validator(mode='after')
    def validate_production_safety(self):
        if self.app_env == "production" and self.intasend_mode == "mock":
            raise ValueError(
                "Production environment cannot use mock payments. "
                "Set INTASEND_MODE=real in production."
            )
        if self.app_env == "production":
            if self.jwt_secret_key == "change-me":
                raise ValueError("JWT_SECRET_KEY must be set in production")
            if self.jwt_refresh_secret_key == "change-me":
                raise ValueError("JWT_REFRESH_SECRET_KEY must be set in production")
            if not self.intasend_webhook_secret:
                raise ValueError("INTASEND_WEBHOOK_SECRET must be set in production")
        return self

settings = Settings()