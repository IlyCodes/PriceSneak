from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session

from backend.core.database import SessionLocal
from backend.core.config import settings
from backend.models.user import User

# Extrait le token JWT du header HTTP "Authorization: Bearer <token>"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_db() -> Generator:
    """Ouvre et referme proprement une session PostgreSQL pour chaque requête."""
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """Vérifie la validité du JWT et renvoie l'utilisateur associé."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides ou token expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id_str).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user
