from sqlalchemy.orm import Session
from backend.models.product import Product
from backend.models.alert import Alert
from backend.models.pricing_rule import PricingRule
from backend.models.competitor_product import CompetitorProduct
import decimal
import json

def evaluate_product_rules(db: Session, competitor_product_id: str, new_competitor_price: float, old_competitor_price: float | None = None):
    # If this is the very first scrape, we just record the competitor price but don't apply rules yet
    # because rules might depend on price fluctuations.
    if old_competitor_price is None:
        return

    comp_prod = db.query(CompetitorProduct).filter(CompetitorProduct.id == competitor_product_id).first()
    if not comp_prod:
        return

    product = db.query(Product).filter(Product.id == comp_prod.product_id).first()
    if not product or not product.rule_id or not product.is_active:
        return

    rule = db.query(PricingRule).filter(PricingRule.id == product.rule_id, PricingRule.is_enabled == True).first()
    if not rule:
        return

    # Deterministic rule evaluation
    current_my_price = float(product.my_current_price) if product.my_current_price else 0.0
    new_price = current_my_price

    if rule.is_equal:
        new_price = new_competitor_price
    else:
        offset = float(rule.value) if rule.value else 0.0
        
        if rule.value_type == 'percentage':
            delta = new_competitor_price * (offset / 100.0)
        else:
            delta = offset

        if rule.comparison_operator == 'lower_than':
            new_price = new_competitor_price - delta
        elif rule.comparison_operator == 'higher_than':
            new_price = new_competitor_price + delta

    # Protects margins from destructive down-pricing spirals
    cost_price = float(product.cost_price) if product.cost_price else 0.0
    if new_price < cost_price:
        new_price = cost_price

    new_price = round(new_price, 2)

    if current_my_price != new_price:
        product.my_current_price = decimal.Decimal(str(new_price))
        
        # Create an alert payload as JSON to allow frontend to format and translate it dynamically
        alert_type = "price_decrease" if new_price < current_my_price else "price_increase"
        message = json.dumps({
            "rule_name": rule.name,
            "product_name": product.name,
            "comp_price": float(new_competitor_price),
            "new_price": float(new_price)
        })
        
        alert = Alert(
            user_id=product.user_id,
            competitor_product_id=comp_prod.id,
            message=message,
            alert_type=alert_type
        )
        db.add(alert)
        db.commit()
