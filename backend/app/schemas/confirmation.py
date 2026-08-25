from pydantic import BaseModel

class ConfirmDeliveryRequest(BaseModel):
    phone: str

class ReportProblemRequest(BaseModel):
    phone: str
    reason: str

class ConfirmationResponse(BaseModel):
    status: str

class DisputeResponse(BaseModel):
    status: str
    dispute_id: str
