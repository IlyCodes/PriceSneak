import sys
import os

# Ajouter le dossier parent au PYTHONPATH pour pouvoir importer backend.*
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.database import SessionLocal, engine, Base
from backend.models import (
    User, UserSettings, PricingRule, Product, Competitor, 
    CompetitorProduct, ProductAnalysis, Alert
)
from backend.models.user_settings import CurrencyEnum, LanguageEnum
from backend.models.pricing_rule import (
    ValueTypeEnum, ComparisonOperatorEnum, PositionEnum, 
    FrequencyEnum, EventTypeEnum, EventScopeEnum
)

def seed():
    print("Nettoyage de la base de données (DROP ALL)...")
    # Pour un script de seed de dev, on supprime et recrée toutes les tables pour repartir à zéro
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Création des utilisateurs...")
        admin = User(
            name="Admin Superuser",
            email="admin@pricesneak.com",
            password_hash="hashed_password_placeholder",
            is_admin=True
        )
        merchant = User(
            name="Tech Store Maroc",
            email="contact@techstore.ma",
            password_hash="hashed_password_placeholder",
            is_admin=False
        )
        db.add_all([admin, merchant])
        db.flush() # Pour récupérer les IDs sans faire de commit définitif

        print("Création des paramètres utilisateurs...")
        admin_settings = UserSettings(user_id=admin.id, currency=CurrencyEnum.USD, language=LanguageEnum.ENG)
        merchant_settings = UserSettings(user_id=merchant.id, currency=CurrencyEnum.MAD, language=LanguageEnum.FR)
        db.add_all([admin_settings, merchant_settings])

        print("Création des concurrents...")
        amazon = Competitor(name="Amazon", domain_url="amazon.fr")
        fnac = Competitor(name="Fnac", domain_url="fnac.com")
        db.add_all([amazon, fnac])
        db.flush()

        print("Création des règles de tarification...")
        rule_match_cheapest = PricingRule(
            is_enabled=True,
            is_equal=True, # On s'aligne exactement sur le prix
            position=PositionEnum.CHEAPEST,
            frequency=FrequencyEnum.DAILY,
            event_type=EventTypeEnum.PRICE_DROP,
            event_scope=EventScopeEnum.MARKET_AVERAGE
        )
        rule_lower_than_avg = PricingRule(
            is_enabled=True,
            is_equal=False,
            value=5.00,
            value_type=ValueTypeEnum.PERCENTAGE,
            comparison_operator=ComparisonOperatorEnum.LOWER_THAN,
            position=PositionEnum.AVG,
            frequency=FrequencyEnum.DAILY
        )
        db.add_all([rule_match_cheapest, rule_lower_than_avg])
        db.flush()

        print("Création des produits (Catalogue marchand)...")
        iphone = Product(
            user_id=merchant.id,
            rule_id=rule_match_cheapest.id,
            sku="APL-IPH15-PRO-256",
            name="Apple iPhone 15 Pro (256 Go)",
            brand="Apple",
            category="Smartphones",
            my_current_price=1200.00,
            cost_price=1050.00, # Filet de sécurité (Prix de revient)
            is_active=True
        )
        samsung = Product(
            user_id=merchant.id,
            rule_id=rule_lower_than_avg.id,
            sku="SAM-S24-ULTRA",
            name="Samsung Galaxy S24 Ultra",
            brand="Samsung",
            category="Smartphones",
            my_current_price=1300.00,
            cost_price=1100.00,
            is_active=True
        )
        db.add_all([iphone, samsung])
        db.flush()

        print("Création des liens vers les concurrents (Scraping links)...")
        iphone_amazon = CompetitorProduct(
            product_id=iphone.id,
            competitor_id=amazon.id,
            product_url="https://www.amazon.fr/dp/B0CHX...",
            current_price=1190.00,
            is_in_stock=True
        )
        iphone_fnac = CompetitorProduct(
            product_id=iphone.id,
            competitor_id=fnac.id,
            product_url="https://www.fnac.com/Apple-iPhone-15-Pro...",
            current_price=1210.00,
            is_in_stock=True
        )
        samsung_amazon = CompetitorProduct(
            product_id=samsung.id,
            competitor_id=amazon.id,
            product_url="https://www.amazon.fr/dp/B0CS...",
            current_price=1350.00,
            is_in_stock=False # Rupture de stock chez le concurrent
        )
        db.add_all([iphone_amazon, iphone_fnac, samsung_amazon])
        db.flush()

        print("Création de l'analyse agrégée du marché...")
        # Pour l'iPhone (Marché: Amazon à 1190, Fnac à 1210)
        iphone_analysis = ProductAnalysis(
            product_id=iphone.id,
            cheapest_price=1190.00,
            highest_price=1210.00,
            avg_price=1200.00
        )
        # Pour le Samsung (Seulement Amazon connu à 1350)
        samsung_analysis = ProductAnalysis(
            product_id=samsung.id,
            cheapest_price=1350.00,
            highest_price=1350.00,
            avg_price=1350.00
        )
        db.add_all([iphone_analysis, samsung_analysis])
        db.flush()

        print("Création des alertes de notification...")
        alert1 = Alert(
            user_id=merchant.id,
            competitor_product_id=iphone_amazon.id,
            message="Alerte: Amazon a baissé le prix de l'iPhone 15 Pro à 1190€, en dessous de votre prix (1200€).",
            is_read=False
        )
        db.add(alert1)

        db.commit()
        print("✅ Base de données initialisée avec succès avec les données de test B2B !")

    except Exception as e:
        db.rollback()
        print(f"❌ Erreur critique lors du seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
