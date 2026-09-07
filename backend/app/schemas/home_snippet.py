from pydantic import BaseModel
import uuid

class SnippetProductIn(BaseModel):
    product_id: uuid.UUID
    position: int

class HomeSnippetUpdate(BaseModel):
    title: str | None = None
    products: list[SnippetProductIn] = []

class HomeSnippetProductOut(BaseModel):
    product_id: uuid.UUID
    position: int

class HomeSnippetResponse(BaseModel):
    title: str
    products: list[HomeSnippetProductOut]
