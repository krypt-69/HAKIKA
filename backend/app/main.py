from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.error_handlers import (
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler
)

app = FastAPI(
    title="Hakika API",
    description="Hakika Version 1.0",
    version="0.1.0",
)

app.include_router(api_router, prefix="/api/v1")

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

@app.get("/")
async def root():
    return {"message": "Hakika API running"}
