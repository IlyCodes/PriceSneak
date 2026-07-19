import sys
import os

# Ajouter le dossier parent au PYTHONPATH pour pouvoir importer backend.*
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.database import engine, Base
# Importer tous les modèles pour qu'ils soient enregistrés sur la Base de SQLAlchemy
from backend.models import *

def init_db():
    print("Tentative de connexion à PostgreSQL et génération des tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Toutes les tables ont été créées avec succès dans PostgreSQL !")
    except Exception as e:
        print(f"Erreur lors de la génération des tables : {e}")
        print("\nConseil : Assurez-vous que le conteneur Docker PostgreSQL est bien lancé avec 'docker-compose up -d'.")

if __name__ == "__main__":
    init_db()
