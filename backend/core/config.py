import os
from pydantic_settings import BaseSettings, SettingsConfigDict

# Trouve le chemin absolu vers le dossier "backend" pour charger le .env depuis n'importe où
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE_PATH = os.path.join(BASE_DIR, ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "PriceSneak API"
    
    # Base de données
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: int

    # Sécurité JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    
    # Charge automatiquement le fichier .env en utilisant le chemin absolu
    model_config = SettingsConfigDict(env_file=ENV_FILE_PATH, env_file_encoding="utf-8")

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()
