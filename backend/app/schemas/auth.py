from pydantic import BaseModel
import uuid

class ActivationCheckRequest(BaseModel):
    identifier: str  # email or phone

class ActivationCheckResponse(BaseModel):
    email: str
    email: str
    rider_id: uuid.UUID
    name: str
    business_name: str
    can_activate: bool

class ActivationRequest(BaseModel):
    identifier: str
    password: str
