from fastapi import APIRouter
from app.api.v1.endpoints import (
    health, auth, discovery, business, product, order,
    rider, delivery, confirmation, payment, settlement, admin, images, credit
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(discovery.router, tags=["discovery"])
api_router.include_router(business.router, tags=["businesses"])
api_router.include_router(product.router, tags=["products"])
api_router.include_router(order.router, tags=["orders"])
api_router.include_router(rider.router, tags=["riders"])
api_router.include_router(delivery.router, tags=["delivery"])
api_router.include_router(confirmation.router, tags=["confirmation"])
api_router.include_router(payment.router, tags=["payments"])
api_router.include_router(settlement.router, tags=["settlements"])
api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(images.router, tags=["images"])
api_router.include_router(credit.router, tags=["credit"])

from app.api.v1.endpoints.business_riders import router as business_riders_router
api_router.include_router(business_riders_router, tags=["business_riders"])
