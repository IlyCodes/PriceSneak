import sys
import os

# Add the root directory to the Python path so absolute imports like 'backend.core...' work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.core.database import SessionLocal
from backend.models.competitor_product import CompetitorProduct
from backend.worker.tasks.scraper import scrape_competitor_price

def test_scraper(competitor_product_id: str = None):
    db = SessionLocal()
    try:
        # If no ID is provided, just pick the first one in the database
        if not competitor_product_id:
            comp_prod = db.query(CompetitorProduct).first()
            if not comp_prod:
                print("❌ No competitor products found in the database. Please add one first.")
                return
            competitor_product_id = str(comp_prod.id)
            print(f"🎯 No ID provided. Picked the first competitor product: {competitor_product_id}")
            print(f"🔗 Target URL: {comp_prod.product_url}")
        
        print(f"🚀 Starting manual scrape for ID: {competitor_product_id}...")
        
        # Call the Celery task synchronously for testing
        # This will bypass Celery and run exactly here in your terminal
        scrape_competitor_price(competitor_product_id)
        
        print("✅ Scrape and Rule Evaluation completed successfully!")
        print("Check your PostgreSQL database for the new price, and MongoDB for the history.")
        
    except Exception as e:
        print(f"❌ An error occurred during scraping: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # You can pass an ID as a command-line argument: python test_scraper.py <ID>
    target_id = sys.argv[1] if len(sys.argv) > 1 else None
    test_scraper(target_id)
