from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator

class Settings(BaseSettings):
    # App
    app_env: str = "development"

    # Database
    database_url: str = "postgresql+asyncpg://hakika:hakika_dev@localhost:5432/hakika_db"
    database_url_sync: str = "postgresql+psycopg2://hakika:hakika_dev@localhost:5432/hakika_db"
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    jwt_secret_key: str = "change-me"
    jwt_refresh_secret_key: str = "change-me"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    customer_session_expire_hours: int = 24

    # IntaSend
    intasend_mode: str = "mock"  # mock or real
    intasend_api_url: str = "https://sandbox.intasend.com"
    intasend_public_key: str = ""
    intasend_secret_key: str = ""
    intasend_webhook_secret: str = ""
    hakika_fee_percentage: float = 2.0

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
