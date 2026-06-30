from pydantic import BaseModel
import uuid

class BusinessCreate(BaseModel):
    name: str
    category_id: int
    description: str | None = None

class BusinessResponse(BaseModel):
    id: uuid.UUID
    name: str
    category_id: int
    trust_score: float

    class Config:
        from_attributes = True
