from sqlalchemy.orm import Session
from backend.models.product import Product
from backend.models.alert import Alert
from backend.models.pricing_rule import PricingRule
from backend.models.competitor_product import CompetitorProduct
import decimal

def evaluate_product_rules(db: Session, competitor_product_id: str, new_competitor_price: float, old_competitor_price: float | None = None):
    # If this is the very first scrape, we just record the competitor price but don't apply rules yet
    # because rules might depend on price fluctuations.
    if old_competitor_price is None:
        return

    # Retrieve the competitor product
    comp_prod = db.query(CompetitorProduct).filter(CompetitorProduct.id == competitor_product_id).first()
    if not comp_prod:
        return

    # Retrieve the main product
    product = db.query(Product).filter(Product.id == comp_prod.product_id).first()
    if not product or not product.rule_id or not product.is_active:
        return

    # Retrieve the rule
    rule = db.query(PricingRule).filter(PricingRule.id == product.rule_id, PricingRule.is_enabled == True).first()
    if not rule:
        return

    # Deterministic rule evaluation
    current_my_price = float(product.my_current_price) if product.my_current_price else 0.0
    new_price = current_my_price

    if rule.is_equal:
        # Exact Match
        new_price = new_competitor_price
    else:
        # Proportional Match
        # e.g., value = 5, value_type = 'percentage' -> -5%
        # rule.comparison_operator (lower_than, higher_than) 
        # usually means we want to be lower than or higher than the target
        
        offset = float(rule.value) if rule.value else 0.0
        
        if rule.value_type == 'percentage':
            delta = new_competitor_price * (offset / 100.0)
        else:
            # amount
            delta = offset

        if rule.comparison_operator == 'lower_than':
            new_price = new_competitor_price - delta
        elif rule.comparison_operator == 'higher_than':
            new_price = new_competitor_price + delta

    # Ensure price doesn't go below cost price
    cost_price = float(product.cost_price) if product.cost_price else 0.0
    if new_price < cost_price:
        new_price = cost_price

    # Round to 2 decimal places
    new_price = round(new_price, 2)

    # Check if price actually needs updating
    if current_my_price != new_price:
        # Update my current price
        product.my_current_price = decimal.Decimal(str(new_price))
        
        # Create an alert
        message = (f"Rule '{rule.name}' applied for '{product.name}'. "
                   f"Competitor price updated to {new_competitor_price}€. "
                   f"Your new price is {new_price}€.")
        
        alert = Alert(
            user_id=product.user_id,
            competitor_product_id=comp_prod.id,
            message=message
        )
        db.add(alert)
        db.commit()
