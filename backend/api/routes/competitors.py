from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from typing import List
from uuid import UUID
import urllib.parse
from datetime import datetime

from backend.api.deps import get_db, get_current_user
from backend.models.user import User
from backend.models.product import Product
from backend.models.competitor import Competitor
from backend.models.competitor_product import CompetitorProduct
from backend.schemas.competitor import (
    CompetitorProductCreate,
    CompetitorProductResponse,
    PriceHistoryResponse,
)
from backend.core.mongodb import get_mongo_db
from backend.worker.tasks.scraper import scrape_competitor_price

router = APIRouter()


def extract_domain(url: str) -> str:
    try:
        parsed_uri = urllib.parse.urlparse(url)
        domain = "{uri.netloc}".format(uri=parsed_uri)
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return "unknown.com"


@router.post(
    "/{product_id}/competitors",
    response_model=CompetitorProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_competitor_product(
    product_id: UUID,
    data: CompetitorProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Prevent IDOR attacks by ensuring ownership
    stmt = select(Product).where(
        Product.id == product_id, Product.user_id == current_user.id
    )
    result = db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    url_str = str(data.product_url)
    domain = extract_domain(url_str)

    # Avoid duplicate competitors table entries for same store
    stmt_comp = select(Competitor).where(Competitor.domain_url == domain)
    comp_result = db.execute(stmt_comp)
    competitor = comp_result.scalar_one_or_none()

    if not competitor:
        name = domain.split(".")[0].capitalize()
        competitor = Competitor(name=name, domain_url=domain)
        db.add(competitor)
        db.commit()
        db.refresh(competitor)

    # Prevent tracking same product twice
    stmt_cp = select(CompetitorProduct).where(
        CompetitorProduct.product_id == product.id,
        CompetitorProduct.competitor_id == competitor.id,
    )
    cp_result = db.execute(stmt_cp)
    if cp_result.scalar_one_or_none():
        raise HTTPException(
            status_code=400, detail="Competitor already added for this product"
        )

    competitor_product = CompetitorProduct(
        product_id=product.id,
        competitor_id=competitor.id,
        product_url=url_str,
        current_price=None,
        is_in_stock=True,
    )

    db.add(competitor_product)
    db.commit()
    db.refresh(competitor_product)

    # Avoid N+1 queries when returning competitor details
    db.refresh(competitor_product, ["competitor"])

    # Launch a background scraping task immediately so the user gets initial data quickly
    scrape_competitor_price.delay(str(competitor_product.id))

    return competitor_product


@router.get("/{product_id}/competitors", response_model=List[CompetitorProductResponse])
async def list_competitor_products(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Prevent IDOR attacks by ensuring ownership
    stmt = select(Product).where(
        Product.id == product_id, Product.user_id == current_user.id
    )
    result = db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")

    stmt_cps = select(CompetitorProduct).where(
        CompetitorProduct.product_id == product_id
    )
    cps_result = db.execute(stmt_cps)
    competitor_products = cps_result.scalars().all()

    return competitor_products


@router.delete(
    "/{product_id}/competitors/{competitor_product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_competitor_product(
    product_id: UUID,
    competitor_product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Prevent IDOR attacks by ensuring ownership
    stmt = select(Product).where(
        Product.id == product_id, Product.user_id == current_user.id
    )
    result = db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")

    stmt_cp = select(CompetitorProduct).where(
        CompetitorProduct.id == competitor_product_id,
        CompetitorProduct.product_id == product_id,
    )
    cp_result = db.execute(stmt_cp)
    cp = cp_result.scalar_one_or_none()

    if not cp:
        raise HTTPException(status_code=404, detail="Competitor product not found")

    db.delete(cp)
    db.commit()


@router.put(
    "/{product_id}/competitors/{competitor_product_id}",
    response_model=CompetitorProductResponse,
)
async def update_competitor_product(
    product_id: UUID,
    competitor_product_id: UUID,
    data: CompetitorProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Prevent IDOR attacks by ensuring ownership
    stmt = select(Product).where(
        Product.id == product_id, Product.user_id == current_user.id
    )
    result = db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")

    stmt_cp = select(CompetitorProduct).where(
        CompetitorProduct.id == competitor_product_id,
        CompetitorProduct.product_id == product_id,
    )
    cp_result = db.execute(stmt_cp)
    cp = cp_result.scalar_one_or_none()

    if not cp:
        raise HTTPException(status_code=404, detail="Competitor product not found")

    url_str = str(data.product_url)
    domain = extract_domain(url_str)

    # Avoid duplicate competitors table entries for same store
    stmt_comp = select(Competitor).where(Competitor.domain_url == domain)
    comp_result = db.execute(stmt_comp)
    competitor = comp_result.scalar_one_or_none()

    if not competitor:
        name = domain.split(".")[0].capitalize()
        competitor = Competitor(name=name, domain_url=domain)
        db.add(competitor)
        db.commit()
        db.refresh(competitor)

    # Prevent duplicate associations during update
    if cp.competitor_id != competitor.id:
        stmt_dup = select(CompetitorProduct).where(
            CompetitorProduct.product_id == product_id,
            CompetitorProduct.competitor_id == competitor.id,
        )
        if db.execute(stmt_dup).scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="Another competitor product already exists with this domain",
            )

    cp.product_url = url_str
    cp.competitor_id = competitor.id

    db.commit()
    db.refresh(cp)
    db.refresh(cp, ["competitor"])

    return cp


@router.get(
    "/{product_id}/competitors/{competitor_product_id}/history",
    response_model=PriceHistoryResponse,
)
async def get_competitor_price_history(
    product_id: UUID,
    competitor_product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Prevent IDOR attacks by ensuring ownership
    stmt = select(Product).where(
        Product.id == product_id, Product.user_id == current_user.id
    )
    result = db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")

    mongo_db = get_mongo_db()

    # Fetch analytics data from timeseries DB
    cursor = mongo_db.price_history.find(
        {"metadata.competitor_product_id": str(competitor_product_id)}
    ).sort("recorded_at", 1)

    history = []
    async for doc in cursor:
        history.append(
            {
                "recorded_at": doc["recorded_at"],
                "price": doc.get("price", doc.get("competitor_price", 0.0)),
            }
        )

    return {"competitor_product_id": competitor_product_id, "history": history}
