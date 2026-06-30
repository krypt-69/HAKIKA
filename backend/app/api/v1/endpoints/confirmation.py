from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.delivery_repository import DeliveryRepository
from app.repositories.trust_event_repository import TrustEventRepository
from app.repositories.dispute_repository import DisputeRepository
from app.services.confirmation_service import ConfirmationService
from app.schemas.confirmation import ConfirmDeliveryRequest, ReportProblemRequest, ConfirmationResponse, DisputeResponse
import uuid

router = APIRouter(prefix="/orders", tags=["confirmation"])

def get_confirmation_service(db: AsyncSession = Depends(get_db)):
    order_repo = OrderRepository(db)
    customer_repo = CustomerRepository(db)
    delivery_repo = DeliveryRepository(db)
    trust_event_repo = TrustEventRepository(db)
    dispute_repo = DisputeRepository(db)
    return ConfirmationService(order_repo, customer_repo, delivery_repo, trust_event_repo, dispute_repo, db)

@router.post("/{order_id}/confirm", response_model=ConfirmationResponse)
async def confirm_delivery(
    order_id: str,
    data: ConfirmDeliveryRequest,
    service: ConfirmationService = Depends(get_confirmation_service)
):
    return await service.confirm_delivery(uuid.UUID(order_id), data.phone)

@router.post("/{order_id}/report-problem", response_model=DisputeResponse)
async def report_problem(
    order_id: str,
    data: ReportProblemRequest,
    service: ConfirmationService = Depends(get_confirmation_service)
):
    return await service.report_problem(uuid.UUID(order_id), data.phone, data.reason)
