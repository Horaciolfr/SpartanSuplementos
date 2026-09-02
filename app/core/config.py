from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "e87b649d288d4041b31548e65813ec79f538e1245b738128362629b359f13775"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ADMIN_INITIAL_PASSWORD: str = "SpartanAdmin2026!"
    ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
