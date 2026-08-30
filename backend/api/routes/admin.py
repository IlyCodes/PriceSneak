from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Any

from backend.api import deps
from backend.models.user import User
from backend.models.product import Product
from backend.models.competitor_product import CompetitorProduct
from backend.core.mongodb import get_mongo_db

router = APIRouter()

@router.get("/metrics")
async def get_metrics(
    db: Session = Depends(deps.get_db),
    current_admin: User = Depends(deps.get_current_admin_user),
) -> Any:
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_products = db.query(func.count(Product.id)).scalar() or 0
    total_competitors = db.query(func.count(CompetitorProduct.id)).scalar() or 0
    
    # Try to get scrape counts from mongo if possible
    mongo_db = get_mongo_db()
    total_scrapes = 0
    if mongo_db is not None:
        try:
            total_scrapes = await mongo_db.price_history.estimated_document_count()
        except Exception:
            pass

    return {
        "total_users": total_users,
        "total_products": total_products,
        "total_competitors": total_competitors,
        "total_scrapes": total_scrapes
    }

@router.get("/users")
def get_users(
    db: Session = Depends(deps.get_db),
    current_admin: User = Depends(deps.get_current_admin_user),
) -> Any:
    users = db.query(User).all()
    
    result = []
    for user in users:
        products_count = db.query(func.count(Product.id)).filter(Product.user_id == user.id).scalar() or 0
        result.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "products_count": products_count
        })
        
    return result

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(deps.get_db),
    current_admin: User = Depends(deps.get_current_admin_user),
) -> Any:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
        
    # Deleting the user will cascade and delete their Postgres products, rules, and alerts.
    db.delete(user)
    db.commit()
    
    return {"message": "Utilisateur supprimé avec succès"}

from backend.models.faq import FAQ
from backend.schemas.faq import FAQResponse, FAQCreate, FAQUpdate
from typing import List

@router.get("/faqs", response_model=List[FAQResponse])
def get_faqs(
    db: Session = Depends(deps.get_db),
    current_admin: User = Depends(deps.get_current_admin_user),
) -> Any:
    faqs = db.query(FAQ).order_by(FAQ.created_at.desc()).all()
    return faqs

@router.post("/faqs", response_model=FAQResponse)
def create_faq(
    *,
    db: Session = Depends(deps.get_db),
    faq_in: FAQCreate,
    current_admin: User = Depends(deps.get_current_admin_user),
) -> Any:
    faq = FAQ(**faq_in.model_dump())
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq

@router.put("/faqs/{faq_id}", response_model=FAQResponse)
def update_faq(
    *,
    db: Session = Depends(deps.get_db),
    faq_id: str,
    faq_in: FAQUpdate,
    current_admin: User = Depends(deps.get_current_admin_user),
) -> Any:
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ introuvable")
        
    update_data = faq_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(faq, field, value)
        
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq

@router.delete("/faqs/{faq_id}")
def delete_faq(
    *,
    db: Session = Depends(deps.get_db),
    faq_id: str,
    current_admin: User = Depends(deps.get_current_admin_user),
) -> Any:
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ introuvable")
        
    db.delete(faq)
    db.commit()
    return {"message": "FAQ supprimée avec succès"}
