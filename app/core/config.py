from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ADMIN_INITIAL_PASSWORD: str
    ALGORITHM: str = "HS256"
    ENVIRONMENT: str = "development"

    # Comunicacion privada Gateway -> microservicio IA.
    IA_SERVICE_URL: str = "http://localhost:8001"
    IA_INTERNAL_API_KEY: str = ""

    # Configuración de Correo Electrónico (Notificaciones, Códigos de Verificación y Recuperación)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "soporte@spartan.dev"
    SMTP_FROM_NAME: str = "Spartan Suplementos Bolivia"
    SMTP_TLS: bool = True
    EMAIL_DEBUG_CODES: bool = False

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
