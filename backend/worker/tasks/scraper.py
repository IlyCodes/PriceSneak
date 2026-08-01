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

def parse_price_string(text: str) -> float | None:
    """Extract float from raw string, handling localization."""
    if not text: return None
    text = re.sub(r'[^\d.,]', '', text)
    if ',' in text and '.' in text:
        text = text.replace(',', '')
    elif ',' in text:
        if re.search(r',\d{2}$', text):
            text = text.replace(',', '.')
        else:
            text = text.replace(',', '')
    try:
        val = float(text)
        return val if val > 0 else None
    except ValueError:
        return None

def extract_price_from_html(html_content: str) -> float | None:
    """Extract price using selectors, structured data, or regex."""
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Bypass DOM variations with hardcoded rules
    amazon_price = soup.find("span", class_="a-price")
    if amazon_price:
        offscreen = amazon_price.find("span", class_="a-offscreen")
        if offscreen:
            val = parse_price_string(offscreen.get_text(strip=True))
            if val: return val

    ebay_price = soup.find(class_=re.compile(r'x-price-primary|prc-IeVDqc', re.IGNORECASE))
    if ebay_price:
        val = parse_price_string(ebay_price.get_text(strip=True))
        if val: return val

    walmart_price = soup.find(itemprop="price")
    if walmart_price and walmart_price.has_attr("content"):
        val = parse_price_string(walmart_price["content"])
        if val: return val

    # Search standard JSON-LD
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
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

    # Regex fallback on likely price containers
    price_elements = soup.find_all(class_=re.compile(r'price|amount|valeur', re.IGNORECASE))
    for el in price_elements:
        text = el.get_text(strip=True)
        val = parse_price_string(text)
        if val:
            return val

    return None

def async_insert_mongo_price(product_id: str, comp_prod_id: str, price: float):
    """Bridge async mongo driver to sync Celery task."""
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
            
            old_competitor_price = float(comp_prod.current_price) if comp_prod.current_price is not None else None

            # 1. Update PostgreSQL
            comp_prod.current_price = new_price
            comp_prod.last_scraped_at = datetime.utcnow()
            db.commit()

            # 2. Insert into MongoDB Time Series
            async_insert_mongo_price(str(comp_prod.product_id), str(comp_prod.id), new_price)

            logger.info("Evaluating Pricing Rules...")
            evaluate_product_rules(db, str(comp_prod.id), new_price, old_competitor_price)
        else:
            logger.warning("Price extraction failed or returned None. Database not updated.")



    finally:
        db.close()
