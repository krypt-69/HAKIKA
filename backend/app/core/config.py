from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://hakika:hakika_dev@localhost:5432/hakika_db"
    database_url_sync: str = "postgresql+psycopg2://hakika:hakika_dev@localhost:5432/hakika_db"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-me"
    jwt_secret_key: str = "change-me"
    jwt_refresh_secret_key: str = "change-me"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    customer_session_expire_hours: int = 24

    # IntaSend
    intasend_api_url: str = "https://sandbox.intasend.com/api/v1"
    intasend_public_key: str = ""
    intasend_secret_key: str = ""
    intasend_webhook_secret: str = ""
    intasend_test_mode: bool = False
    use_mock_payments: bool = False
    hakika_fee_percentage: float = 2.0

    sentry_dsn: str = ""
    r2_access_key: str = ""
    r2_secret_key: str = ""
    r2_bucket: str = "hakika-dev"
    environment: str = "development"

    class Config:
        env_file = ".env"
        extra = "allow"

    @field_validator('jwt_secret_key', 'jwt_refresh_secret_key')
    @classmethod
    def check_production_secrets(cls, v, info):
        if v == "change-me" and info.data.get('environment', '') == 'production':
            raise ValueError(f'{info.field_name} must be changed in production')
        return v

settings = Settings()
