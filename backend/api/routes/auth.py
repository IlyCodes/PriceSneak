from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Any

from backend.api import deps
from backend.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
)
from backend.models.user import User
from backend.models.user_settings import UserSettings, CurrencyEnum, LanguageEnum
from backend.schemas.user import (
    UserCreate,
    UserResponse,
    Token,
    UserUpdate,
    UserPasswordUpdate,
    UserSettingsResponse,
    UserSettingsUpdate,
)

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

    user = User(
        email=user_in.email,
        name=user_in.name,
        password_hash=get_password_hash(user_in.password),
        is_admin=False,
    )
    db.add(user)
    db.flush()  # Generate user ID for foreign key assignment before final commit

    # Prevent frontend crash by ensuring settings exist for new users
    settings = UserSettings(
        user_id=user.id, currency=CurrencyEnum.USD, language=LanguageEnum.ENG
    )
    db.add(settings)
    db.commit()
    db.refresh(user)

    return user


@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
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

    return {
        "access_token": create_access_token(subject=user.id),
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(deps.get_current_user)) -> Any:
    """
    Permet à un utilisateur de récupérer ses informations grâce à son token JWT (passé dans l'en-tête).
    """
    return current_user


@router.put("/me", response_model=UserResponse)
def update_current_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Met à jour les informations du profil utilisateur courant (nom, email).
    """
    if user_in.email and user_in.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_in.email).first()
        if existing_user:
            raise HTTPException(
                status_code=400, detail="Un utilisateur avec cet email existe déjà."
            )
        current_user.email = user_in.email

    if user_in.name:
        current_user.name = user_in.name

    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password", response_model=dict)
def update_password(
    *,
    db: Session = Depends(deps.get_db),
    password_in: UserPasswordUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Modifie le mot de passe de l'utilisateur courant.
    """
    if not verify_password(password_in.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=400, detail="Le mot de passe actuel est incorrect."
        )

    current_user.password_hash = get_password_hash(password_in.new_password)
    db.commit()
    return {"message": "Mot de passe mis à jour avec succès."}


@router.get("/me/settings", response_model=UserSettingsResponse)
def read_current_user_settings(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Récupère les paramètres de l'utilisateur courant.
    """
    settings = (
        db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    )
    if not settings:
        settings = UserSettings(
            user_id=current_user.id,
            currency=CurrencyEnum.USD,
            language=LanguageEnum.ENG,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/me/settings", response_model=UserSettingsResponse)
def update_current_user_settings(
    *,
    db: Session = Depends(deps.get_db),
    settings_in: UserSettingsUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Met à jour les paramètres de l'utilisateur courant.
    """
    settings = (
        db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    )
    if not settings:
        settings = UserSettings(
            user_id=current_user.id,
            currency=CurrencyEnum.USD,
            language=LanguageEnum.ENG,
        )
        db.add(settings)
        # Delay commit to bundle changes transactionally

    if settings_in.currency is not None:
        settings.currency = settings_in.currency
    if settings_in.language is not None:
        settings.language = settings_in.language
    if settings_in.dashboard_notification is not None:
        settings.dashboard_notification = settings_in.dashboard_notification
    if settings_in.email_notification is not None:
        settings.email_notification = settings_in.email_notification

    db.commit()
    db.refresh(settings)
    return settings
