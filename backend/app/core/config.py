from pydantic_settings import BaseSettings

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
    hakika_fee_percentage: float = 2.0

    class Config:
        env_file = ".env"

settings = Settings()
