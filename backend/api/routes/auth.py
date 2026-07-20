from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Any

from backend.api import deps
from backend.core.security import verify_password, get_password_hash, create_access_token
from backend.models.user import User
from backend.models.user_settings import UserSettings, CurrencyEnum, LanguageEnum
from backend.schemas.user import UserCreate, UserResponse, Token

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """
    Inscription d'un nouvel utilisateur.
    Création automatique de ses paramètres par défaut (UserSettings).
    """
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="Un utilisateur avec cet email existe déjà.",
        )
    
    # Création de l'utilisateur avec hash Bcrypt
    user = User(
        email=user_in.email,
        name=user_in.name,
        password_hash=get_password_hash(user_in.password),
        is_admin=False
    )
    db.add(user)
    db.flush() # Récupérer l'ID sans commit final
    
    # Création des UserSettings en 1-to-1 (par défaut USD et Anglais)
    settings = UserSettings(
        user_id=user.id,
        currency=CurrencyEnum.USD,
        language=LanguageEnum.ENG
    )
    db.add(settings)
    db.commit()
    db.refresh(user)
    
    return user

@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    Connexion OAuth2 (génère le token JWT).
    Le form_data attend les champs 'username' (ici email) et 'password'.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Génération du JWT
    return {
        "access_token": create_access_token(subject=user.id),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserResponse)
def read_current_user(
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Permet à un utilisateur de récupérer ses informations grâce à son token JWT (passé dans l'en-tête).
    """
    return current_user
