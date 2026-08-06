from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Any
import random
import string

from backend.api import deps
from backend.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
)
from backend.core.email import send_verification_email, send_security_alert_email
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
    EmailVerify,
    ResendVerification,
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

    verification_code = "".join(random.choices(string.digits, k=6))

    user = User(
        email=user_in.email,
        name=user_in.name,
        password_hash=get_password_hash(user_in.password),
        is_admin=False,
        is_verified=False,
        verification_code=verification_code,
    )
    db.add(user)
    db.flush()  # Why: db.flush() generates the user ID needed for the UserSettings foreign key relation before committing

    # Why: Prevent frontend crash by ensuring settings exist for new users
    settings = UserSettings(
        user_id=user.id, currency=CurrencyEnum.USD, language=LanguageEnum.ENG
    )
    db.add(settings)
    db.commit()
    db.refresh(user)

    send_verification_email(user.email, verification_code)

    return user


@router.post("/verify-email")
def verify_email(
    *,
    db: Session = Depends(deps.get_db),
    data: EmailVerify,
) -> Any:
    """
    Vérifie le code à 6 chiffres envoyé par email.
    """
    user = db.query(User).filter((User.email == data.email) | (User.pending_email == data.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
    
    if user.verification_code != data.code:
        raise HTTPException(status_code=400, detail="Code de vérification invalide.")
    
    if user.pending_email == data.email:
        old_email = user.email
        user.email = user.pending_email
        user.pending_email = None
        user.is_verified = True
        user.verification_code = None
        db.commit()
        send_security_alert_email(old_email, "email_changed")
        return {"message": "Nouvel email vérifié et mis à jour avec succès."}
    else:
        if user.is_verified:
            return {"message": "L'email est déjà vérifié."}
        
        user.is_verified = True
        user.verification_code = None
        db.commit()
        
        return {"message": "Email vérifié avec succès."}


@router.post("/resend-verification")
def resend_verification(
    *,
    db: Session = Depends(deps.get_db),
    data: ResendVerification,
) -> Any:
    """
    Renvoie un nouveau code de vérification à l'utilisateur.
    """
    user = db.query(User).filter((User.email == data.email) | (User.pending_email == data.email)).first()
    if not user:
        # Why: Return OK even if email doesn't exist to prevent email enumeration attacks
        return {"message": "Si l'email existe, un nouveau code a été envoyé."}
    
    if user.email == data.email and user.is_verified:
        return {"message": "L'email est déjà vérifié."}
    
    verification_code = "".join(random.choices(string.digits, k=6))
    user.verification_code = verification_code
    db.commit()
    
    target_email = user.pending_email if user.pending_email == data.email else user.email
    send_verification_email(target_email, verification_code)
    
    return {"message": "Un nouveau code de vérification a été envoyé."}


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

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Veuillez vérifier votre adresse email",
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
        existing_user = db.query(User).filter((User.email == user_in.email) | (User.pending_email == user_in.email)).first()
        if existing_user:
            raise HTTPException(
                status_code=400, detail="Un utilisateur avec cet email existe déjà."
            )
        
        verification_code = "".join(random.choices(string.digits, k=6))
        current_user.pending_email = user_in.email
        current_user.verification_code = verification_code
        send_verification_email(current_user.pending_email, verification_code)
        # Why: We don't update current_user.email yet to prevent account lockout; it's updated only after verifying the code.

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
    send_security_alert_email(current_user.email, "password_changed")
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
        # Why: Delay commit here to bundle all subsequent settings updates transactionally

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
