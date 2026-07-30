from celery import shared_task
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.core.database import SessionLocal
from backend.models.product import Product
from backend.models.pricing_rule import PricingRule
from backend.models.competitor_product import CompetitorProduct
from backend.worker.tasks.scraper import scrape_competitor_price
import logging

logger = logging.getLogger(__name__)

def is_time_to_scrape(last_scraped_at: datetime | None, frequency: str) -> bool:
    if not last_scraped_at:
        return True
    
    now = datetime.utcnow()
    delta = now - last_scraped_at
    
    if frequency == "daily" and delta > timedelta(days=1):
        return True
    elif frequency == "weekly" and delta > timedelta(weeks=1):
        return True
    elif frequency == "monthly" and delta > timedelta(days=30):
        return True
        
    return False

@shared_task(name="check_schedules_and_trigger_scrapes")
def check_schedules_and_trigger_scrapes():
    """
    Global tick task running periodically.
    Checks all products with an active pricing rule and triggers scraping if their frequency interval has passed.
    """
    db = SessionLocal()
    try:
        # Find all products that have an active rule assigned AND are active
        products_with_rules = db.query(Product).join(PricingRule).filter(
            Product.rule_id != None,
            PricingRule.is_enabled == True,
            Product.is_active == True
        ).all()

        scrapes_triggered = 0
        for product in products_with_rules:
            rule = product.pricing_rule
            frequency = rule.frequency.value if rule.frequency else "daily" # Default to daily if not set
            
            # Check all competitor URLs for this product
            for comp_prod in product.competitor_products:
                if is_time_to_scrape(comp_prod.last_scraped_at, frequency):
                    logger.info(f"Triggering scheduled scrape for CompetitorProduct {comp_prod.id} (Frequency: {frequency})")
                    scrape_competitor_price.delay(str(comp_prod.id))
                    scrapes_triggered += 1

        logger.info(f"Global Tick finished: Triggered {scrapes_triggered} new scrapes.")
    except Exception as e:
        logger.error(f"Error in global tick scheduler: {e}")
    finally:
        db.close()
