from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://hakika:hakika_dev@localhost:5432/hakika_db"
    database_url_sync: str = "postgresql+psycopg2://hakika:hakika_dev@localhost:5432/hakika_db"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
