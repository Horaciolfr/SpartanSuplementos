from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class IASettings(BaseSettings):
    SERVICE_NAME: str = "Spartan Biometric IA Microservice"
    PORT: int = 8002
    DATABASE_URL: str
    ROBOFLOW_API_KEY: str = ""
    ENVIRONMENT: str = "development"
    IA_INTERNAL_API_KEY: str = ""
    SECRET_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = IASettings()
