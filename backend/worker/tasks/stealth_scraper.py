from playwright.sync_api import sync_playwright
import logging
import random
import time
from backend.core.config import settings

logger = logging.getLogger(__name__)

def execute_advanced_stealth_scrape(url: str) -> float | None:
    """
    Tier 3 Scraper: Deep browser stealth and behavioral simulation via Playwright.
    Why: Bypasses advanced WAFs like Distil, Datadome, or PerimeterX (eBay, Walmart).
    """
    logger.info(f"Initiating ADVANCED STEALTH scraper for: {url}")
    
    # Why: Mobile subdomains often have significantly lower bot-detection thresholds.
    if "ebay.com" in url.lower() and "m.ebay.com" not in url.lower():
        url = url.replace("www.ebay.com", "m.ebay.com")
        logger.info(f"Transformed to mobile URL: {url}")

    try:
        # Why: Imported here to avoid crashing the main worker if playwright is missing.
        from playwright_stealth.stealth import stealth_sync
        from backend.worker.tasks.scraper import extract_price_from_html
        
        with sync_playwright() as p:
            launch_kwargs = {
                "headless": True,
                "args": [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ]
            }
            
            proxy_url = settings.PROXY_URL
            if proxy_url:
                logger.info("Using configured proxy for stealth scraper.")
                launch_kwargs["proxy"] = {"server": proxy_url}
                
            browser = p.chromium.launch(**launch_kwargs)
            
            # Why: Using a common Windows/Chrome string helps blend into normal consumer traffic.
            user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            
            context = browser.new_context(
                user_agent=user_agent,
                viewport={'width': 1366, 'height': 768},
                locale='en-US',
                timezone_id='America/New_York',
                device_scale_factor=1,
                ignore_https_errors=True,
            )
            
            page = context.new_page()
            # Why: Apply stealth evasions (e.g. removes webdriver flag, spoofs WebGL) to evade detection.
            stealth_sync(page)
            
            # Go to the page
            page.goto(url, wait_until='domcontentloaded', timeout=60000)
            
            # Why: PerimeterX monitors mouse and scroll events to verify human presence.
            if "walmart.com" in url.lower():
                time.sleep(1)
                # Random mouse jiggling
                page.mouse.move(random.randint(100, 500), random.randint(100, 500), steps=5)
                time.sleep(0.5)
                # Scroll down
                page.evaluate("window.scrollBy(0, 400)")
                time.sleep(1)
                # Jiggle again
                page.mouse.move(random.randint(100, 500), random.randint(100, 500), steps=5)
                # Scroll back up a bit
                page.evaluate("window.scrollBy(0, -200)")
                time.sleep(1)
            
            # Extract HTML after simulation
            html_content = page.content()
            browser.close()
            
            # Check for captchas
            if "captcha" in html_content.lower() or "robot or human" in html_content.lower():
                logger.warning(f"Advanced stealth scraper was detected by CAPTCHA on {url}")
                return None
                
            # Parse price
            return extract_price_from_html(html_content)

    except Exception as e:
        logger.error(f"Advanced stealth scraper failed: {e}")
        return None
