import os
from pydantic_settings import BaseSettings, SettingsConfigDict

# Trouve le chemin absolu vers le dossier "backend" pour charger le .env depuis n'importe où
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE_PATH = os.path.join(BASE_DIR, ".env")


class Settings(BaseSettings):
    PROJECT_NAME: str = "PriceSneak API"

    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: int

    MONGO_SERVER: str
    MONGO_USER: str
    MONGO_PASSWORD: str
    MONGO_DB: str
    MONGO_PORT: int

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    REDIS_URL: str = "redis://localhost:6379/0"
    PROXY_URL: str | None = None

    model_config = SettingsConfigDict(env_file=ENV_FILE_PATH, env_file_encoding="utf-8", extra="ignore")

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def MONGO_URI(self) -> str:
        return f"mongodb://{self.MONGO_USER}:{self.MONGO_PASSWORD}@{self.MONGO_SERVER}:{self.MONGO_PORT}"


settings = Settings()
