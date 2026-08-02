from curl_cffi import requests
from backend.worker.tasks.scraper import extract_price_from_html
import logging
from backend.core.config import settings

logger = logging.getLogger(__name__)

def fetch_price_with_tls_impersonation(url: str) -> float | None:
    """
    Tier 2 Scraper: TLS Impersonation via curl_cffi.
    Why: Bypasses standard bot-mitigation (like Amazon) that block generic requests.
    """
    try:
        logger.info(f"Initiating intelligent fallback scraper for: {url}")
        
        request_kwargs = {
            "impersonate": "chrome110",
            "timeout": 60,
            "headers": {
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.google.com/"
            }
        }
        
        proxy_url = settings.PROXY_URL
        if proxy_url:
            logger.info("Using configured proxy for fallback scraper.")
            request_kwargs["proxies"] = {"http": proxy_url, "https": proxy_url}
            request_kwargs["verify"] = False

        response = requests.get(url, **request_kwargs)
        
        if response.status_code == 200:
            return extract_price_from_html(response.text)
        else:
            logger.warning(f"Fallback scraper received status {response.status_code}")
            return None
    except Exception as e:
        logger.error(f"Fallback scraper failed: {e}")
        return None
