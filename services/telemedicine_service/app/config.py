from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5444/telemedicine_db"

    # Application
    APP_NAME: str = "Telemedicine Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8080"]

    # Video provider
    VIDEO_PROVIDER: str = "jitsi"
    JOIN_TOKEN_TTL_SECONDS: int = 3600

    # Jitsi
    JITSI_BASE_URL: str = "https://meet.jit.si"
    JITSI_ROOM_PREFIX: str = "healthcare"

    # Twilio (optional)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_API_KEY: str = ""
    TWILIO_API_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

