from app.repositories.product_repository import ProductRepository
from app.repositories.business_repository import BusinessRepository
from app.models.user import User
from app.models.product_image import ProductImage
from app.models.product import SellingUnit
from app.repositories.product_category_repository import ProductCategoryRepository
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductImageResponse
from fastapi import HTTPException, status
from sqlalchemy import select
import uuid

class ProductService:
    def __init__(self, product_repo: ProductRepository, business_repo: BusinessRepository, db):
        self.product_repo = product_repo
        self.business_repo = business_repo
        self.db = db

    def _validate_product_fields(self, data) -> None:
        if data.selling_unit not in [u.value for u in SellingUnit]:
            raise HTTPException(400, "Invalid selling unit")
        if data.currency != 'KES':
            raise HTTPException(400, "Unsupported currency")
        if data.min_order_quantity is not None and data.min_order_quantity < 1:
            raise HTTPException(400, "Minimum order quantity must be at least 1")
        if data.max_order_quantity is not None and data.max_order_quantity < data.min_order_quantity:
            raise HTTPException(400, "Maximum order quantity cannot be less than minimum order quantity")
        if data.track_inventory and data.stock_quantity is None:
            raise HTTPException(400, "Stock quantity is required when inventory tracking is enabled")
        if data.stock_quantity is not None and data.stock_quantity < 0:
            raise HTTPException(400, "Stock quantity cannot be negative")


    async def create_product(self, user: User, business_id: uuid.UUID, data: ProductCreate) -> ProductResponse:
        business = await self.business_repo.get_by_id(business_id)
        if not business or business.owner_id != user.id:
            raise HTTPException(403, "Forbidden")
        if data.discount_price and data.discount_price > data.original_price:
            raise HTTPException(400, "Discount cannot exceed original price")
        self._validate_product_fields(data)
        if data.category_id is not None:
            cat_repo = ProductCategoryRepository(self.db)
            if not await cat_repo.get_by_id(data.category_id):
                raise HTTPException(400, "Invalid product category")
        product = await self.product_repo.create(
            business_id=business_id,
            name=data.name,
            description=data.description,
            original_price=data.original_price,
            discount_price=data.discount_price,
            image_url=data.image_url,
            currency=data.currency,
            selling_unit=data.selling_unit,
            track_inventory=data.track_inventory,
            stock_quantity=data.stock_quantity,
            min_order_quantity=data.min_order_quantity,
            max_order_quantity=data.max_order_quantity,
            category_id=data.category_id,
        )
        return await self._to_response(product)

    async def get_product(self, product_id: uuid.UUID) -> ProductResponse:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise HTTPException(404, "Product not found")
        return await self._to_response(product)

    async def list_business_products(self, business_id: uuid.UUID) -> list[ProductResponse]:
        products = await self.product_repo.list_by_business(business_id)
        return [await self._to_response(p) for p in products]

    async def update_product(self, user: User, product_id: uuid.UUID, data: ProductUpdate) -> ProductResponse:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise HTTPException(404, "Product not found")
        business = await self.business_repo.get_by_id(product.business_id)
        if not business or business.owner_id != user.id:
            raise HTTPException(403, "Forbidden")
        update_data = data.model_dump(exclude_unset=True)
        if 'discount_price' in update_data and update_data['discount_price']:
            original = update_data.get('original_price', product.original_price)
            if update_data['discount_price'] > original:
                raise HTTPException(400, "Discount cannot exceed original price")
        # validate new fields from update_data if present
        from types import SimpleNamespace
        merged_data = SimpleNamespace(**{**product.__dict__, **update_data})
        self._validate_product_fields(merged_data)
        if 'category_id' in update_data and update_data['category_id'] is not None:
            cat_repo = ProductCategoryRepository(self.db)
            if not await cat_repo.get_by_id(update_data['category_id']):
                raise HTTPException(400, "Invalid product category")
        product = await self.product_repo.update(product, **update_data)
        return await self._to_response(product)

    async def delete_product(self, user: User, product_id: uuid.UUID):
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise HTTPException(404, "Product not found")
        business = await self.business_repo.get_by_id(product.business_id)
        if not business or business.owner_id != user.id:
            raise HTTPException(403, "Forbidden")
        await self.product_repo.soft_delete(product)

    async def _to_response(self, product) -> ProductResponse:
        # Fetch images
        img_result = await self.db.execute(
            select(ProductImage).where(ProductImage.product_id == product.id).order_by(ProductImage.position)
        )
        images = img_result.scalars().all()
        image_list = [
            ProductImageResponse(id=img.id, position=img.position, url=f"/api/v1/product/{img.id}")
            for img in images
        ]
        return ProductResponse(
            id=product.id, business_id=product.business_id, name=product.name,
            description=product.description, original_price=float(product.original_price),
            discount_price=float(product.discount_price) if product.discount_price else None,
            image_url=product.image_url, is_available=product.is_available,
            currency=product.currency or 'KES',
            selling_unit=product.selling_unit or 'Piece',
            track_inventory=product.track_inventory or False,
            stock_quantity=product.stock_quantity,
            min_order_quantity=product.min_order_quantity or 1,
            max_order_quantity=product.max_order_quantity,
            category_id=product.category_id,
            images=image_list
        )
