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
