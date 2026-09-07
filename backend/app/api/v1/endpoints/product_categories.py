from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.repositories.product_category_repository import ProductCategoryRepository

router = APIRouter(prefix="/product-categories", tags=["product_categories"])

@router.get("")
async def list_product_categories(db: AsyncSession = Depends(get_db)):
    repo = ProductCategoryRepository(db)
    cats = await repo.list_all()
    return [{"id": c.id, "name": c.name} for c in cats]
