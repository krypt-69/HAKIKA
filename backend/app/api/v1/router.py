from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, discovery, business, product, order

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(discovery.router, tags=["discovery"])
api_router.include_router(business.router, tags=["businesses"])
api_router.include_router(product.router, tags=["products"])
api_router.include_router(order.router, tags=["orders"])
