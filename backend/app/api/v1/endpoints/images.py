from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.business import Business
from app.models.product import Product
from app.models.product_image import ProductImage
from app.utils.images import validate_and_process
from app.repositories.business_repository import BusinessRepository
from datetime import datetime
from fastapi.responses import Response
import uuid

router = APIRouter(tags=["images"])

# ---- Business Images ----
@router.post("/businesses/{business_id}/logo")
async def upload_logo(business_id: str, file: UploadFile = File(...),
                      current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    business = await db.get(Business, uuid.UUID(business_id))
    if not business or business.owner_id != current_user.id:
        raise HTTPException(403)
    data = validate_and_process(file, max_dim=800, max_bytes=200_000)
    business.logo_data = data
    business.logo_updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "ok"}

@router.post("/businesses/{business_id}/cover")
async def upload_cover(business_id: str, file: UploadFile = File(...),
                       current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    business = await db.get(Business, uuid.UUID(business_id))
    if not business or business.owner_id != current_user.id:
        raise HTTPException(403)
    data = validate_and_process(file, max_dim=800, max_bytes=300_000)
    business.cover_data = data
    business.cover_updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "ok"}

@router.get("/business/{slug}/logo", response_class=Response)
async def get_logo(slug: str, db: AsyncSession = Depends(get_db)):
    repo = BusinessRepository(db)
    business = await repo.get_by_slug(slug)
    if not business or not business.logo_data:
        raise HTTPException(404)
    return Response(content=business.logo_data, media_type="image/webp")

@router.get("/business/{slug}/cover", response_class=Response)
async def get_cover(slug: str, db: AsyncSession = Depends(get_db)):
    repo = BusinessRepository(db)
    business = await repo.get_by_slug(slug)
    if not business or not business.cover_data:
        raise HTTPException(404)
    return Response(content=business.cover_data, media_type="image/webp")

# ---- Product Images ----
@router.post("/products/{product_id}/images")
async def upload_product_image(product_id: str, file: UploadFile = File(...),
                               current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, uuid.UUID(product_id))
    if not product:
        raise HTTPException(404)
    business = await db.get(Business, product.business_id)
    if not business or business.owner_id != current_user.id:
        raise HTTPException(403)
    count = (await db.execute(select(func.count(ProductImage.id)).where(ProductImage.product_id == product.id))).scalar()
    if count >= 3:
        raise HTTPException(400, "Maximum 3 images per product")
    data = validate_and_process(file, max_dim=1200, max_bytes=200_000)
    positions = (await db.execute(select(ProductImage.position).where(ProductImage.product_id == product.id))).scalars().all()
    next_pos = 1
    while next_pos in positions:
        next_pos += 1
    img = ProductImage(product_id=product.id, image_data=data, position=next_pos)
    db.add(img)
    await db.commit()
    await db.refresh(img)
    return {"id": str(img.id), "position": img.position, "url": f"/api/v1/product/{img.id}"}

@router.delete("/products/{product_id}/images/{image_id}")
async def delete_product_image(product_id: str, image_id: str,
                               current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, uuid.UUID(product_id))
    if not product: raise HTTPException(404)
    business = await db.get(Business, product.business_id)
    if not business or business.owner_id != current_user.id: raise HTTPException(403)
    img = await db.get(ProductImage, uuid.UUID(image_id))
    if not img or img.product_id != product.id: raise HTTPException(404)
    deleted_pos = img.position
    await db.delete(img)
    await db.flush()
    remaining = (await db.execute(select(ProductImage).where(ProductImage.product_id == product.id).order_by(ProductImage.position))).scalars().all()
    for i, img_obj in enumerate(remaining, start=1):
        if img_obj.position != i:
            img_obj.position = i
    await db.commit()
    return {"status": "ok"}

# Serve product image
@router.get("/product/{image_id}", response_class=Response)
async def get_product_image(image_id: str, db: AsyncSession = Depends(get_db)):
    img = await db.get(ProductImage, uuid.UUID(image_id))
    if not img: raise HTTPException(404)
    return Response(content=img.image_data, media_type="image/webp")

# ID‑based logo/cover endpoints (fallback)
@router.get("/businesses/{business_id}/logo", response_class=Response)
async def get_logo_by_id(business_id: str, db: AsyncSession = Depends(get_db)):
    business = await db.get(Business, uuid.UUID(business_id))
    if not business or not business.logo_data:
        raise HTTPException(404)
    return Response(content=business.logo_data, media_type="image/webp")

@router.get("/businesses/{business_id}/cover", response_class=Response)
async def get_cover_by_id(business_id: str, db: AsyncSession = Depends(get_db)):
    business = await db.get(Business, uuid.UUID(business_id))
    if not business or not business.cover_data:
        raise HTTPException(404)
    return Response(content=business.cover_data, media_type="image/webp")
