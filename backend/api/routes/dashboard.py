from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Dict, Any

from backend.api.deps import get_db, get_current_user
from backend.models.user import User
from backend.models.product import Product
from backend.models.alert import Alert
from backend.models.product_analysis import ProductAnalysis

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    
    # 1. Total Tracked Products
    total_products = db.query(func.count(Product.id)).filter(
        Product.user_id == current_user.id,
        Product.is_active == True
    ).scalar() or 0

    # 2. Price Changes (Alerts stats)
    decreased_count = db.query(func.count(Alert.id)).filter(
        Alert.user_id == current_user.id,
        Alert.alert_type == "price_decrease"
    ).scalar() or 0
    
    increased_count = db.query(func.count(Alert.id)).filter(
        Alert.user_id == current_user.id,
        Alert.alert_type == "price_increase"
    ).scalar() or 0

    # 3. Recent Alerts (Top 2)
    recent_alerts = db.query(Alert).filter(
        Alert.user_id == current_user.id
    ).order_by(Alert.created_at.desc()).limit(2).all()

    formatted_alerts = []
    for a in recent_alerts:
        product = a.competitor_product.product if a.competitor_product else None
        formatted_alerts.append({
            "id": str(a.id),
            "message": a.message,
            "created_at": a.created_at,
            "alert_type": a.alert_type,
            "is_read": a.is_read,
            "product_name": product.name if product else "Unknown"
        })

    # 4. Price Position (6 positions)
    # Join Product and ProductAnalysis to calculate position dynamically
    # Positions: cheapest, avg, highest, higher_than_avg, cheaper_than_avg, all_equal
    positions = {
        "cheapest": 0,
        "cheaper_than_avg": 0,
        "avg": 0,
        "higher_than_avg": 0,
        "highest": 0,
        "all_equal": 0
    }

    analyzed_products = db.query(Product, ProductAnalysis).join(
        ProductAnalysis, Product.id == ProductAnalysis.product_id
    ).filter(
        Product.user_id == current_user.id,
        Product.is_active == True
    ).all()

    for p, pa in analyzed_products:
        my_price = p.my_current_price
        c_price = pa.cheapest_price
        a_price = pa.avg_price
        h_price = pa.highest_price
        
        if my_price is None or c_price is None or h_price is None:
            continue
            
        if c_price == h_price and my_price == c_price:
            positions["all_equal"] += 1
        elif my_price <= c_price:
            positions["cheapest"] += 1
        elif my_price >= h_price:
            positions["highest"] += 1
        elif a_price is not None and my_price == a_price:
            positions["avg"] += 1
        elif a_price is not None and c_price < my_price < a_price:
            positions["cheaper_than_avg"] += 1
        elif a_price is not None and a_price < my_price < h_price:
            positions["higher_than_avg"] += 1

    return {
        "total_tracked_products": total_products,
        "price_changes": {
            "decreased": decreased_count,
            "increased": increased_count
        },
        "recent_alerts": formatted_alerts,
        "price_positions": positions
    }
