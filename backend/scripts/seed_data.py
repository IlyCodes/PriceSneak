import asyncio
import os
import sys
import random
from datetime import datetime, timedelta

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from backend.core.database import SessionLocal
from backend.core.mongodb import connect_to_mongo, close_mongo_connection, get_mongo_db
from backend.models.user import User
from backend.models.product import Product
from backend.models.competitor import Competitor
from backend.models.competitor_product import CompetitorProduct
from backend.core.security import get_password_hash


async def seed_data():
    print("Starting data seeding...")

    # 1. PostgreSQL Data
    db: Session = SessionLocal()

    try:
        # Check for user
        user = db.query(User).filter(User.email == "test@pricesneak.com").first()
        if not user:
            print("Creating test user...")
            user = User(
                name="Test User",
                email="test@pricesneak.com",
                password_hash=get_password_hash("password123"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Check for product
        product = db.query(Product).filter(Product.user_id == user.id).first()
        if not product:
            print("Creating test product...")
            product = Product(
                sku="TEST-001",
                name="Test Smartphone X",
                brand="TestBrand",
                category="Electronics",
                cost_price=500.0,
                my_current_price=699.0,
                is_active=True,
                user_id=user.id,
            )
            db.add(product)
            db.commit()
            db.refresh(product)

        # Check for competitors
        competitors_data = [
            {
                "name": "Amazon",
                "domain_url": "amazon.fr",
                "url": "https://amazon.fr/dp/TEST12345",
                "base_price": 750.0,
            },
            {
                "name": "Fnac",
                "domain_url": "fnac.com",
                "url": "https://fnac.com/mp/TEST12345",
                "base_price": 730.0,
            },
            {
                "name": "Darty",
                "domain_url": "darty.com",
                "url": "https://darty.com/nav/extra/TEST12345",
                "base_price": 745.0,
            },
        ]

        comp_products = []

        for c_data in competitors_data:
            competitor = (
                db.query(Competitor)
                .filter(Competitor.domain_url == c_data["domain_url"])
                .first()
            )
            if not competitor:
                print(f"Creating test competitor {c_data['name']}...")
                competitor = Competitor(
                    name=c_data["name"], domain_url=c_data["domain_url"]
                )
                db.add(competitor)
                db.commit()
                db.refresh(competitor)

            comp_product = (
                db.query(CompetitorProduct)
                .filter(
                    CompetitorProduct.product_id == product.id,
                    CompetitorProduct.competitor_id == competitor.id,
                )
                .first()
            )

            if not comp_product:
                print(f"Creating test competitor product for {c_data['name']}...")
                comp_product = CompetitorProduct(
                    product_id=product.id,
                    competitor_id=competitor.id,
                    product_url=c_data["url"],
                    current_price=c_data["base_price"],
                    is_in_stock=True,
                    last_scraped_at=datetime.utcnow(),
                )
                db.add(comp_product)
                db.commit()
                db.refresh(comp_product)

            comp_products.append(
                {"cp": comp_product, "base_price": c_data["base_price"]}
            )

        # 2. MongoDB Time Series Data
        print("Connecting to MongoDB...")
        await connect_to_mongo()
        mongo_db = get_mongo_db()

        print("Generating mock price history (last 90 days) for all competitors...")
        now = datetime.utcnow()

        for item in comp_products:
            comp_product = item["cp"]
            base_price = item["base_price"]
            docs = []

            for i in range(90, -1, -1):
                date = now - timedelta(days=i)
                # Add some random walk to the price
                base_price += random.uniform(-10, 10)
                if base_price < 600:
                    base_price = 600.0

                docs.append(
                    {
                        "recorded_at": date,
                        "metadata": {
                            "competitor_product_id": str(comp_product.id),
                            "product_id": str(product.id),
                        },
                        "competitor_price": round(base_price, 2),
                        "is_in_stock": random.random() > 0.1,  # 90% chance in stock
                    }
                )

            # Delete existing history for this competitor product to avoid duplicates
            await mongo_db.price_history.delete_many(
                {"metadata.competitor_product_id": str(comp_product.id)}
            )

            # Insert new history
            await mongo_db.price_history.insert_many(docs)
            print(
                f"Inserted {len(docs)} price history documents for {comp_product.product_url}."
            )

            # Update PostgreSQL current price to match the last inserted price
            last_price = docs[-1]["competitor_price"]
            comp_product.current_price = last_price
            comp_product.last_scraped_at = now
            db.commit()
            print(
                f"Updated PostgreSQL current_price to {last_price} for {comp_product.product_url}"
            )

        print("Generating mock price history for my_current_price...")
        my_base_price = 700.0
        my_docs = []
        for i in range(90, -1, -1):
            date = now - timedelta(days=i)
            my_base_price += random.uniform(-15, 15)
            if my_base_price < 600:
                my_base_price = 600.0

            my_docs.append(
                {
                    "recorded_at": date,
                    "metadata": {
                        "competitor_product_id": "self",
                        "product_id": str(product.id),
                    },
                    "competitor_price": round(my_base_price, 2),
                    "is_in_stock": True,
                }
            )

        await mongo_db.price_history.delete_many(
            {
                "metadata.competitor_product_id": "self",
                "metadata.product_id": str(product.id),
            }
        )
        await mongo_db.price_history.insert_many(my_docs)
        print(f"Inserted {len(my_docs)} price history documents for own product.")

        product.my_current_price = my_docs[-1]["competitor_price"]
        db.commit()
        print(f"Updated PostgreSQL my_current_price to {product.my_current_price}")

    except Exception as e:
        print(f"Error seeding data: {e}")
    finally:
        db.close()
        await close_mongo_connection()
        print("Seeding complete.")


if __name__ == "__main__":
    asyncio.run(seed_data())
