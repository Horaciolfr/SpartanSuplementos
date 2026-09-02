from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class IASettings(BaseSettings):
    SERVICE_NAME: str = "Spartan Biometric IA Microservice"
    PORT: int = 8002
    DATABASE_URL: str = "postgresql+asyncpg://postgres:123456789@localhost:5432/spartan_db"
    ROBOFLOW_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = IASettings()
