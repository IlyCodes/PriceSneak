from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
    Response,
    UploadFile,
    File,
)
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Any, List
from uuid import UUID
import math

from backend.api.deps import get_db
from backend.api.deps import get_current_user
from backend.models.user import User
from backend.models.product import Product
from backend.models.competitor_product import CompetitorProduct
from backend.models.product_analysis import ProductAnalysis
from backend.worker.celery_app import celery_app  # MUST import to configure Celery broker
from backend.worker.tasks.scraper import scrape_competitor_price
from backend.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    PaginatedProductResponse,
)
from backend.schemas.product_analysis import ProductAnalysisResponse

router = APIRouter()


@router.get("/", response_model=PaginatedProductResponse)
def get_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: str = Query(
        None, description="Search term for name, sku, brand or category"
    ),
) -> Any:
    """
    Get paginated list of products for the current user.
    """
    skip = (page - 1) * size
    query = (
        db.query(Product)
        .options(
            joinedload(Product.analysis),
            joinedload(Product.competitor_products)
        )
        .filter(Product.user_id == current_user.id)
    )

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.brand.ilike(search_term),
                Product.category.ilike(search_term),
            )
        )

    total = query.count()
    products = query.order_by(Product.created_at.desc()).offset(skip).limit(size).all()

    pages = math.ceil(total / size) if size > 0 else 0

    return {
        "items": products,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    product_in: ProductCreate,
) -> Any:
    """
    Create new product.
    """
    existing_product = (
        db.query(Product)
        .filter(Product.user_id == current_user.id, Product.sku == product_in.sku)
        .first()
    )
    if existing_product:
        raise HTTPException(
            status_code=400,
            detail="A product with this SKU already exists for your account.",
        )

    product = Product(**product_in.model_dump(), user_id=current_user.id)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/export")
def export_products(
    format: str = Query("csv", pattern="^(csv|excel)$"),
    search: str = Query(None, description="Search term for filtering export"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Export products to CSV or Excel, optionally filtered by search term.
    """
    query = (
        db.query(Product)
        .options(joinedload(Product.analysis))
        .filter(Product.user_id == current_user.id)
    )

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.brand.ilike(search_term),
                Product.category.ilike(search_term),
            )
        )

    products = query.order_by(Product.created_at.desc()).all()

    data = []
    for p in products:
        data.append(
            {
                "SKU": p.sku,
                "Name": p.name,
                "Brand": p.brand or "",
                "Category": p.category or "",
                "Cost Price": p.cost_price,
                "My Price": p.my_current_price or "",
                "Active": "Yes" if p.is_active else "No",
            }
        )

    df = pd.DataFrame(data)

    if format == "csv":
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
        response.headers["Content-Disposition"] = (
            "attachment; filename=products_export.csv"
        )
        return response
    else:
        stream = io.BytesIO()
        with pd.ExcelWriter(stream, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Products")

        stream.seek(0)
        response = StreamingResponse(
            iter([stream.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response.headers["Content-Disposition"] = (
            "attachment; filename=products_export.xlsx"
        )
        return response


@router.get("/{id}", response_model=ProductResponse)
def get_product(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    id: UUID,
) -> Any:
    product = (
        db.query(Product)
        .filter(Product.id == id, Product.user_id == current_user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{id}", response_model=ProductResponse)
async def update_product(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    id: UUID,
    product_in: ProductUpdate,
) -> Any:
    product = (
        db.query(Product)
        .filter(Product.id == id, Product.user_id == current_user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product_in.sku is not None and product_in.sku != product.sku:
        existing = (
            db.query(Product)
            .filter(Product.user_id == current_user.id, Product.sku == product_in.sku)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A product with this SKU already exists for your account.",
            )

    update_data = product_in.model_dump(exclude_unset=True)
    old_price = product.my_current_price
    old_rule_id = product.rule_id
    old_is_active = product.is_active

    for field in update_data:
        setattr(product, field, update_data[field])

    db.add(product)
    db.commit()
    db.refresh(product)
    
    # Note: We rely on the global Celery beat task (check_schedules_and_trigger_scrapes) 
    # to handle the periodic scraping based on rule frequency.
    # No immediate scheduling is done here to avoid duplicate tasks.

    # Persist price fluctuations for historical charting
    if "my_current_price" in update_data and old_price != product.my_current_price:
        try:
            from backend.core.mongodb import get_mongo_db

            mongo_db = get_mongo_db()
            from datetime import datetime

            await mongo_db.price_history.insert_one(
                {
                    "recorded_at": datetime.utcnow(),
                    "metadata": {
                        "competitor_product_id": "self",
                        "product_id": str(product.id),
                    },
                    "price": float(product.my_current_price),
                    "is_in_stock": True,
                }
            )
        except Exception as e:
            print(f"Failed to log own price update to MongoDB: {e}")

    return product


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    id: UUID,
) -> None:
    product = (
        db.query(Product)
        .filter(Product.id == id, Product.user_id == current_user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{id}/history")
async def get_product_price_history(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    id: UUID,
) -> Any:
    product = (
        db.query(Product)
        .filter(Product.id == id, Product.user_id == current_user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    from backend.core.mongodb import get_mongo_db

    mongo_db = get_mongo_db()

    cursor = mongo_db.price_history.find(
        {"metadata.competitor_product_id": "self", "metadata.product_id": str(id)}
    ).sort("recorded_at", 1)

    history = []
    async for doc in cursor:
        history.append(
            {
                "recorded_at": (
                    doc["recorded_at"].isoformat()
                    if hasattr(doc["recorded_at"], "isoformat")
                    else doc["recorded_at"]
                ),
                "price": doc.get("price", doc.get("competitor_price", 0.0)),
            }
        )

    return {"history": history}


@router.get("/{id}/analysis", response_model=ProductAnalysisResponse)
async def get_product_analysis(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    id: UUID,
) -> Any:
    product = (
        db.query(Product)
        .filter(Product.id == id, Product.user_id == current_user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    competitors = (
        db.query(CompetitorProduct).filter(CompetitorProduct.product_id == id).all()
    )

    prices = [
        float(c.current_price) for c in competitors if c.current_price is not None
    ]

    if prices:
        cheapest_price = min(prices)
        highest_price = max(prices)
        avg_price = sum(prices) / len(prices)
    else:
        cheapest_price = None
        highest_price = None
        avg_price = None

    analysis = (
        db.query(ProductAnalysis).filter(ProductAnalysis.product_id == id).first()
    )

    if not analysis:
        analysis = ProductAnalysis(
            product_id=id,
            cheapest_price=cheapest_price,
            highest_price=highest_price,
            avg_price=avg_price,
        )
        db.add(analysis)
    else:
        analysis.cheapest_price = cheapest_price
        analysis.highest_price = highest_price
        analysis.avg_price = avg_price

    db.commit()
    db.refresh(analysis)

    return analysis


@router.post("/import", response_model=dict, status_code=status.HTTP_200_OK)
async def import_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    filename = file.filename.lower()
    if not (
        filename.endswith(".csv")
        or filename.endswith(".xlsx")
        or filename.endswith(".xls")
    ):
        raise HTTPException(status_code=400, detail="Invalid file format.")

    contents = await file.read()
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

    required_cols = {"sku", "name", "cost_price"}
    if not required_cols.issubset(set(df.columns)):
        raise HTTPException(status_code=400, detail=f"Missing required columns.")

    df = df.where(pd.notnull(df), None)

    imported_count = 0
    updated_count = 0

    for _, row in df.iterrows():
        sku = str(row.get("sku", "")).strip()
        if not sku or pd.isna(sku):
            continue

        name = str(row.get("name", "")).strip()
        if not name or pd.isna(name):
            continue

        try:
            cost_price = float(row.get("cost_price", 0))
        except:
            continue

        my_current_price = None
        if row.get("my_current_price") is not None:
            try:
                my_current_price = float(row.get("my_current_price"))
            except:
                pass

        is_active = True
        is_active_val = row.get("is_active")
        if is_active_val is not None:
            if isinstance(is_active_val, str) and is_active_val.lower() in (
                "false",
                "0",
                "no",
            ):
                is_active = False
            elif isinstance(is_active_val, bool):
                is_active = is_active_val
            elif is_active_val == 0:
                is_active = False

        product_data = {
            "sku": sku,
            "name": name,
            "brand": str(row.get("brand", "")) if row.get("brand") else None,
            "category": str(row.get("category", "")) if row.get("category") else None,
            "cost_price": cost_price,
            "my_current_price": my_current_price,
            "is_active": is_active,
        }

        existing = (
            db.query(Product)
            .filter(Product.user_id == current_user.id, Product.sku == sku)
            .first()
        )
        if existing:
            for k, v in product_data.items():
                setattr(existing, k, v)
            updated_count += 1
        else:
            new_prod = Product(**product_data, user_id=current_user.id)
            db.add(new_prod)
            imported_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return {
        "message": "Import successful",
        "imported": imported_count,
        "updated": updated_count,
        "total": imported_count + updated_count,
    }
