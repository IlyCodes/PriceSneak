from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List
from uuid import UUID

from backend.api.deps import get_db, get_current_user
from backend.models.user import User
from backend.models.pricing_rule import PricingRule
from backend.models.product import Product
from backend.models.competitor_product import CompetitorProduct
from backend.schemas.pricing_rule import PricingRuleCreate, PricingRuleUpdate, PricingRuleResponse
from backend.worker.celery_app import celery_app  # MUST import to configure Celery broker
from backend.worker.tasks.scraper import scrape_competitor_price

router = APIRouter()

@router.post("/", response_model=PricingRuleResponse)
def create_pricing_rule(
    data: PricingRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule_data = data.model_dump(exclude={"product_ids"})
    rule = PricingRule(**rule_data, user_id=current_user.id)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    
    if data.product_ids is not None:
        db.query(Product).filter(
            Product.user_id == current_user.id,
            Product.id.in_(data.product_ids)
        ).update({"rule_id": rule.id}, synchronize_session=False)
        db.commit()
        db.refresh(rule)
        
        # Trigger immediate scrape for assigned products
        comp_prods = db.query(CompetitorProduct).join(Product).filter(
            CompetitorProduct.product_id.in_(data.product_ids),
            Product.is_active == True
        ).all()
        for cp in comp_prods:
            try:
                scrape_competitor_price.delay(str(cp.id))
            except Exception as e:
                print(f"Warning: Could not trigger celery task: {e}")
        
    rule.products_count = len(data.product_ids) if data.product_ids else 0
    rule.product_ids = data.product_ids or []
    return rule

@router.get("/", response_model=List[PricingRuleResponse])
def get_pricing_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(PricingRule).where(PricingRule.user_id == current_user.id)
    rules = db.execute(stmt).scalars().all()
    
    for rule in rules:
        # Calculate associated products to satisfy the PricingRuleResponse schema expectations
        products = db.query(Product.id).filter(Product.rule_id == rule.id).all()
        product_ids = [p[0] for p in products]
        
        rule.products_count = len(product_ids)
        rule.product_ids = product_ids
        
    return rules

@router.put("/{rule_id}", response_model=PricingRuleResponse)
def update_pricing_rule(
    rule_id: UUID,
    data: PricingRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(PricingRule).where(
        PricingRule.id == rule_id, PricingRule.user_id == current_user.id
    )
    rule = db.execute(stmt).scalar_one_or_none()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
        
    update_data = data.model_dump(exclude_unset=True, exclude={"product_ids"})
    for key, value in update_data.items():
        setattr(rule, key, value)
        
    if data.product_ids is not None:
        # Unlink previous products to prevent orphaned rules before applying the new selection
        db.query(Product).filter(Product.rule_id == rule.id).update({"rule_id": None}, synchronize_session=False)
        # Link the newly selected products to this rule
        db.query(Product).filter(
            Product.user_id == current_user.id,
            Product.id.in_(data.product_ids)
        ).update({"rule_id": rule.id}, synchronize_session=False)
        
    db.commit()
    db.refresh(rule)
    
    if data.product_ids is not None:
        # Trigger immediate scrape for newly assigned products
        comp_prods = db.query(CompetitorProduct).join(Product).filter(
            CompetitorProduct.product_id.in_(data.product_ids),
            Product.is_active == True
        ).all()
        for cp in comp_prods:
            try:
                scrape_competitor_price.delay(str(cp.id))
            except Exception as e:
                print(f"Warning: Could not trigger celery task: {e}")
    
    products = db.query(Product.id).filter(Product.rule_id == rule.id).all()
    product_ids = [p[0] for p in products]
    
    rule.products_count = len(product_ids)
    rule.product_ids = product_ids
    return rule

@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pricing_rule(
    rule_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(PricingRule).where(
        PricingRule.id == rule_id, PricingRule.user_id == current_user.id
    )
    rule = db.execute(stmt).scalar_one_or_none()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
        
    db.delete(rule)
    db.commit()
    return None
