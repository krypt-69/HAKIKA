from app.repositories.product_repository import ProductRepository
from app.repositories.business_repository import BusinessRepository
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from fastapi import HTTPException, status
import uuid

class ProductService:
    def __init__(self, product_repo: ProductRepository, business_repo: BusinessRepository):
        self.product_repo = product_repo
        self.business_repo = business_repo

    async def create_product(self, user: User, business_id: uuid.UUID, data: ProductCreate) -> ProductResponse:
        business = await self.business_repo.get_by_id(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        if business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        # Price validation
        if data.discount_price is not None and data.discount_price > data.original_price:
            raise HTTPException(status_code=400, detail="Discount price cannot exceed original price")
        product = await self.product_repo.create(
            business_id=business_id,
            name=data.name,
            description=data.description,
            original_price=data.original_price,
            discount_price=data.discount_price,
            image_url=data.image_url
        )
        return self._to_response(product)

    async def get_product(self, product_id: uuid.UUID) -> ProductResponse:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return self._to_response(product)

    async def list_business_products(self, business_id: uuid.UUID) -> list[ProductResponse]:
        products = await self.product_repo.list_by_business(business_id)
        return [self._to_response(p) for p in products]

    async def update_product(self, user: User, product_id: uuid.UUID, data: ProductUpdate) -> ProductResponse:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        business = await self.business_repo.get_by_id(product.business_id)
        if business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        update_data = data.model_dump(exclude_unset=True)
        # Price validation if both prices are being updated
        original = update_data.get('original_price', product.original_price)
        discount = update_data.get('discount_price', product.discount_price)
        if discount is not None and discount > original:
            raise HTTPException(status_code=400, detail="Discount price cannot exceed original price")
        product = await self.product_repo.update(product, **update_data)
        return self._to_response(product)

    async def delete_product(self, user: User, product_id: uuid.UUID):
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        business = await self.business_repo.get_by_id(product.business_id)
        if business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        await self.product_repo.soft_delete(product)

    def _to_response(self, product) -> ProductResponse:
        return ProductResponse(
            id=product.id,
            business_id=product.business_id,
            name=product.name,
            description=product.description,
            original_price=float(product.original_price),
            discount_price=float(product.discount_price) if product.discount_price else None,
            image_url=product.image_url,
            is_available=product.is_available
        )
