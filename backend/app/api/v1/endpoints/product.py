from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.repositories.product_repository import ProductRepository
from app.repositories.business_repository import BusinessRepository
from app.services.product_service import ProductService
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
import uuid

router = APIRouter(tags=["products"])

def get_product_service(db: AsyncSession = Depends(get_db)):
    product_repo = ProductRepository(db)
    business_repo = BusinessRepository(db)
    return ProductService(product_repo, business_repo, db)

# Public endpoints (no auth)
@router.get("/businesses/{business_id}/products", response_model=list[ProductResponse])
async def list_business_products(
    business_id: str,
    service: ProductService = Depends(get_product_service)
):
    return await service.list_business_products(uuid.UUID(business_id))

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    service: ProductService = Depends(get_product_service)
):
    return await service.get_product(uuid.UUID(product_id))

# Owner-protected endpoints
@router.post("/businesses/{business_id}/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    business_id: str,
    data: ProductCreate,
    current_user: User = Depends(get_current_user),
    service: ProductService = Depends(get_product_service)
):
    return await service.create_product(current_user, uuid.UUID(business_id), data)

@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    service: ProductService = Depends(get_product_service)
):
    return await service.update_product(current_user, uuid.UUID(product_id), data)

@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    service: ProductService = Depends(get_product_service)
):
    await service.delete_product(current_user, uuid.UUID(product_id))
