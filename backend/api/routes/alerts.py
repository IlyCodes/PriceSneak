from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from typing import List, Any
from uuid import UUID

from backend.api.deps import get_db, get_current_user
from backend.models.user import User
from backend.models.alert import Alert

router = APIRouter()

@router.get("", response_model=List[dict])
async def list_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    sort: str = Query("newest", description="Sort by newest or oldest")
) -> Any:
    
    query = db.query(Alert).filter(Alert.user_id == current_user.id)
    
    if sort == "oldest":
        query = query.order_by(Alert.created_at.asc())
    else:
        query = query.order_by(Alert.created_at.desc())
        
    alerts = query.all()
    
    formatted_alerts = []
    for a in alerts:
        product = a.competitor_product.product if a.competitor_product else None
        formatted_alerts.append({
            "id": str(a.id),
            "message": a.message,
            "created_at": a.created_at,
            "alert_type": a.alert_type,
            "is_read": a.is_read,
            "product_name": product.name if product else "Unknown"
        })
        
    return formatted_alerts

@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_alerts_read(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    db.query(Alert).filter(Alert.user_id == current_user.id).update(
        {"is_read": True}, synchronize_session=False
    )
    db.commit()
    return {"message": "All alerts marked as read"}

@router.put("/{alert_id}/read", status_code=status.HTTP_200_OK)
async def mark_alert_read(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.is_read = True
    db.commit()
    return {"status": "ok"}
