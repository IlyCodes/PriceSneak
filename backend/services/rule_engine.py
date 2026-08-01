from sqlalchemy.orm import Session
from backend.models.product import Product
from backend.models.alert import Alert
from backend.models.pricing_rule import PricingRule
from backend.models.competitor_product import CompetitorProduct
import decimal
import json

def evaluate_product_rules(db: Session, competitor_product_id: str, new_competitor_price: float, old_competitor_price: float | None = None):
    # Skip rules on initial baseline scrape
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

    if rule.event_scope == 'competitor' and rule.competitor_id:
        if str(comp_prod.competitor_id) != str(rule.competitor_id):
            return
        base_price = new_competitor_price
    else:
        all_comp_prods = db.query(CompetitorProduct).filter(
            CompetitorProduct.product_id == product.id,
            CompetitorProduct.current_price.isnot(None)
        ).all()
        prices = [float(cp.current_price) for cp in all_comp_prods if str(cp.id) != str(comp_prod.id)]
        prices.append(new_competitor_price)
        
        if not prices:
            return
            
        if rule.position == 'cheapest':
            base_price = min(prices)
        elif rule.position == 'highest':
            base_price = max(prices)
        else:
            base_price = sum(prices) / len(prices)

    # Calculate target price via deterministic offset
    current_my_price = float(product.my_current_price) if product.my_current_price else 0.0
    new_price = current_my_price

    if rule.is_equal:
        new_price = base_price
    else:
        offset = float(rule.value) if rule.value else 0.0
        
        if rule.value_type == 'percentage':
            delta = base_price * (offset / 100.0)
        else:
            delta = offset

        if rule.comparison_operator == 'lower_than':
            new_price = base_price - delta
        elif rule.comparison_operator == 'higher_than':
            new_price = base_price + delta

    # Enforce hard floor cost price to protect margins
    cost_price = float(product.cost_price) if product.cost_price else 0.0
    if new_price < cost_price:
        new_price = cost_price

    new_price = round(new_price, 2)

    if current_my_price != new_price:
        product.my_current_price = decimal.Decimal(str(new_price))
        
        # Generate translatable JSON alert payload
        alert_type = "price_decrease" if new_price < current_my_price else "price_increase"
        message = json.dumps({
            "rule_name": rule.name,
            "product_name": product.name,
            "comp_price": float(base_price),
            "new_price": float(new_price)
        })
        # Prune old alerts to keep latest state
        comp_prod_ids = [cp.id for cp in db.query(CompetitorProduct).filter(CompetitorProduct.product_id == product.id).all()]
        db.query(Alert).filter(Alert.competitor_product_id.in_(comp_prod_ids)).delete(synchronize_session=False)
        
        alert = Alert(
            user_id=product.user_id,
            competitor_product_id=comp_prod.id,
            message=message,
            alert_type=alert_type
        )
        db.add(alert)
        db.commit()

        # Log historical price adjustment
        try:
            import asyncio
            from datetime import datetime, timezone
            from backend.core.mongodb import get_mongo_db, connect_to_mongo
            
            async def _insert_own_price():
                await connect_to_mongo()
                mongo_db = get_mongo_db()
                if mongo_db is not None:
                    doc = {
                        "recorded_at": datetime.now(timezone.utc),
                        "metadata": {
                            "product_id": str(product.id),
                            "competitor_product_id": "self"
                        },
                        "price": float(new_price),
                        "is_in_stock": True
                    }
                    await mongo_db.price_history.insert_one(doc)
            asyncio.run(_insert_own_price())
        except Exception as e:
            import logging
            logging.error(f"Failed to log own price update to MongoDB: {e}")
