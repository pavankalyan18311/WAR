from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.models import Product, Category, ProductImage
from app.schemas.schemas import ProductOut, ProductListResponse, CategoryOut
from typing import Optional

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    db: AsyncSession = Depends(get_db),
    category: Optional[str] = Query(None),
    color: Optional[str] = Query(None),
    size: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    in_stock: Optional[bool] = Query(None),
    sort: Optional[str] = Query("popular"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = select(Product).where(Product.status == "active")

    if category:
        query = query.join(Category).where(Category.slug == category)
    if color:
        query = query.where(Product.color.ilike(f"%{color}%"))
    if min_price is not None:
        query = query.where(Product.price >= min_price)
    if max_price is not None:
        query = query.where(Product.price <= max_price)
    if in_stock:
        query = query.where(Product.stock_quantity > 0)
    if search:
        query = query.where(
            Product.name.ilike(f"%{search}%") | Product.description.ilike(f"%{search}%")
        )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * limit
    result = await db.execute(query.offset(offset).limit(limit))
    products = result.scalars().all()

    return ProductListResponse(
        data=[ProductOut.model_validate(p) for p in products],
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category))
    return result.scalars().all()


@router.get("/{slug}", response_model=ProductOut)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product).where(Product.slug == slug, Product.status == "active")
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductOut.model_validate(product)
