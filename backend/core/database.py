import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from sqlalchemy import Column, DateTime

# URL de connexion à PostgreSQL
# Par défaut se connecte au conteneur Docker local "localhost" mappé sur le port 5432
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://pricesneak_user:pricesneak_password@localhost:5432/pricesneak_db"
)

# Initialisation du moteur et de la session SQLAlchemy
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe declarative de base pour l'ORM
Base = declarative_base()

# Mixin réutilisable pour injecter created_at et updated_at automatiquement dans toutes les tables
class TimestampMixin:
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow, 
        nullable=False
    )
