from pydantic import BaseModel

class CustomerSessionCreate(BaseModel):
    phone: str
