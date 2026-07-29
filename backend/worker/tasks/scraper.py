import asyncio
from datetime import datetime, timezone
import re
from celery import shared_task
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

from backend.core.database import SessionLocal
from backend.core.config import settings
from backend.core.mongodb import get_mongo_db, connect_to_mongo
from backend.models.competitor_product import CompetitorProduct
from backend.services.rule_engine import evaluate_product_rules
import json

def extract_price_from_html(html_content: str) -> float | None:
    """Heuristic function to find a price in the HTML using JSON-LD or Regex."""
    soup = BeautifulSoup(html_content, "html.parser")
    
    # 1. Try to find JSON-LD schema (Standard for E-commerce SEO)
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
            # Sometimes it's a list of schemas
            if isinstance(data, list):
                for item in data:
                    if item.get("@type") == "Product" and "offers" in item:
                        offers = item["offers"]
                        if isinstance(offers, dict) and "price" in offers:
                            return float(offers["price"])
                        elif isinstance(offers, list) and len(offers) > 0 and "price" in offers[0]:
                            return float(offers[0]["price"])
            elif isinstance(data, dict):
                if data.get("@type") == "Product" and "offers" in data:
                    offers = data["offers"]
                    if isinstance(offers, dict) and "price" in offers:
                        return float(offers["price"])
                    elif isinstance(offers, list) and len(offers) > 0 and "price" in offers[0]:
                        return float(offers[0]["price"])
        except Exception:
            pass

    # 2. Fallback heuristic: look for typical price classes
    price_elements = soup.find_all(class_=re.compile(r'price|amount|valeur', re.IGNORECASE))
    for el in price_elements:
        text = el.get_text(strip=True)
        # Match a price pattern like 19.99, 19,99, $19.99, 19.99€
        match = re.search(r'(\d+[.,]\d{2})', text)
        if match:
            # Normalize comma to dot
            price_str = match.group(1).replace(',', '.')
            try:
                val = float(price_str)
                if val > 0:  # Skip 0.00 prices (like 'Save $0.00')
                    return val
            except ValueError:
                continue

    return None

def async_insert_mongo_price(product_id: str, comp_prod_id: str, price: float):
    """Helper to run the async mongodb insertion synchronously within celery"""
    async def _insert():
        await connect_to_mongo()
        db = get_mongo_db()
        if db is not None:
            doc = {
                "recorded_at": datetime.now(timezone.utc),
                "metadata": {
                    "product_id": str(product_id),
                    "competitor_product_id": str(comp_prod_id)
                },
                "price": price
            }
            await db.price_history.insert_one(doc)
            
    asyncio.run(_insert())

@shared_task(name="scrape_competitor_price")
def scrape_competitor_price(competitor_product_id: str):
    db = SessionLocal()
    try:
        comp_prod = db.query(CompetitorProduct).filter(CompetitorProduct.id == competitor_product_id).first()
        if not comp_prod:
            return

        proxy_config = {"server": settings.PROXY_URL} if settings.PROXY_URL else None
        
        # Scrape with Playwright
        new_price = None
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, proxy=proxy_config)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            
            try:
                page.goto(comp_prod.product_url, wait_until="domcontentloaded", timeout=30000)
                html_content = page.content()
                new_price = extract_price_from_html(html_content)
                logger.info(f"Extracted Price: {new_price}")
            except Exception as e:
                logger.error(f"Error scraping {comp_prod.product_url}: {e}")
            finally:
                browser.close()

        if new_price is not None:
            logger.info("Saving price to PostgreSQL and MongoDB...")
            # 1. Update PostgreSQL
            comp_prod.current_price = new_price
            comp_prod.last_scraped_at = datetime.utcnow()
            db.commit()

            # 2. Insert into MongoDB Time Series
            async_insert_mongo_price(str(comp_prod.product_id), str(comp_prod.id), new_price)

            logger.info("Evaluating Pricing Rules...")
            evaluate_product_rules(db, str(comp_prod.id), new_price)
        else:
            logger.warning("Price extraction failed or returned None. Database not updated.")

    finally:
        db.close()
