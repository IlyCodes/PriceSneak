from datetime import datetime, timedelta
import jwt
import bcrypt
from backend.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie si le mot de passe en clair correspond au hash en base de données."""
    # bcrypt requiert des bytes
    password_bytes = plain_password.encode("utf-8")
    hash_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hash_bytes)


def get_password_hash(password: str) -> str:
    """Transforme un mot de passe en clair en un hash indéchiffrable."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode("utf-8")


def create_access_token(subject: str) -> str:
    """Génère un token JWT signé contenant l'ID de l'utilisateur."""
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # sub (subject) est un standard JWT pour identifier l'utilisateur
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_password_reset_token(email: str, current_hash: str) -> str:
    """Génère un token JWT pour la réinitialisation de mot de passe."""
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode = {
        "exp": expire,
        "sub": email,
        "purpose": "password_reset",
        "hash_fragment": current_hash[:20]
    }
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> dict | None:
    """Vérifie le token de réinitialisation et retourne le payload s'il est valide."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("purpose") != "password_reset":
            return None
        return payload
    except jwt.PyJWTError:
        return None
