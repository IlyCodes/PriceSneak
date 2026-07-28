import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy_utils import database_exists, create_database, drop_database
from fastapi.testclient import TestClient

from backend.main import app
from backend.core.database import Base
from backend.api.deps import get_db
from backend.core.config import settings

# Création d'une base de données dédiée aux tests pour ne pas détruire les données de dev
TEST_DB_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}_test"


@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(TEST_DB_URL)
    if not database_exists(engine.url):
        create_database(engine.url)

    # Création de toutes les tables SQLAlchemy dans la DB de test
    Base.metadata.create_all(bind=engine)
    yield engine

    # Fermeture des connexions actives et suppression complète de la BDD de test
    engine.dispose()
    drop_database(engine.url)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """
    Crée une transaction pour chaque test et fait un "rollback" à la fin.
    Ainsi, la base de données reste complètement vierge pour le test suivant !
    """
    connection = db_engine.connect()
    transaction = connection.begin()

    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=connection
    )
    session = TestingSessionLocal()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """
    Un faux navigateur web (TestClient) qui injecte automatiquement notre fausse base de données.
    """

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
