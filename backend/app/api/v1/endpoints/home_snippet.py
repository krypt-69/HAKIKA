from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.repositories.business_repository import BusinessRepository
from app.repositories.business_home_snippet_repository import BusinessHomeSnippetRepository
from app.repositories.business_home_snippet_product_repository import BusinessHomeSnippetProductRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.home_snippet import HomeSnippetUpdate, HomeSnippetResponse, HomeSnippetProductOut
import uuid

router = APIRouter(prefix="/businesses", tags=["home_snippet"])

DEFAULT_TITLE = "Take a look at what we offer"

async def _validate_and_build(
    db: AsyncSession,
    business_id: uuid.UUID,
    current_user: User,
    payload: HomeSnippetUpdate,
):
    # Ownership
    business = await BusinessRepository(db).get_by_id(business_id)
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Max 5
    if len(payload.products) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 products allowed")

    product_repo = ProductRepository(db)
    # Validate product ids belong to business
    seen_ids = set()
    seen_positions = set()
    for item in payload.products:
        if item.product_id in seen_ids:
            raise HTTPException(status_code=400, detail="Duplicate product selected")
        if item.position in seen_positions:
            raise HTTPException(status_code=400, detail="Duplicate position selected")
        if item.position < 1 or item.position > 5:
            raise HTTPException(status_code=400, detail="Position must be between 1 and 5")
        product = await product_repo.get_by_id(item.product_id)
        if not product or product.business_id != business.id:
            raise HTTPException(status_code=400, detail="Selected product does not belong to this business")
        seen_ids.add(item.product_id)
        seen_positions.add(item.position)

    return business

@router.get("/{business_id}/home-snippet", response_model=HomeSnippetResponse)
async def get_home_snippet(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    biz_id = uuid.UUID(business_id)
    business = await BusinessRepository(db).get_by_id(biz_id)
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    snippet_repo = BusinessHomeSnippetRepository(db)
    snippet = await snippet_repo.get_by_business(biz_id)
    if not snippet:
        return HomeSnippetResponse(title=DEFAULT_TITLE, products=[])

    prod_repo = BusinessHomeSnippetProductRepository(db)
    rows = await prod_repo.list_by_snippet(snippet.id)
    products = [HomeSnippetProductOut(product_id=r.product_id, position=r.position) for r in rows]
    return HomeSnippetResponse(title=snippet.title or DEFAULT_TITLE, products=products)

@router.put("/{business_id}/home-snippet", response_model=HomeSnippetResponse)
async def update_home_snippet(
    business_id: str,
    payload: HomeSnippetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    biz_id = uuid.UUID(business_id)
    await _validate_and_build(db, biz_id, current_user, payload)

    snippet_repo = BusinessHomeSnippetRepository(db)
    snippet = await snippet_repo.get_by_business(biz_id)
    if not snippet:
        snippet = await snippet_repo.create(biz_id, payload.title)
    else:
        snippet = await snippet_repo.update(snippet, payload.title)

    prod_repo = BusinessHomeSnippetProductRepository(db)
    await prod_repo.replace_products(
        snippet.id,
        [{"product_id": p.product_id, "position": p.position} for p in payload.products],
    )

    rows = await prod_repo.list_by_snippet(snippet.id)
    return HomeSnippetResponse(
        title=snippet.title or DEFAULT_TITLE,
        products=[HomeSnippetProductOut(product_id=r.product_id, position=r.position) for r in rows],
    )
