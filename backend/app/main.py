from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.error_handlers import (
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler
)
from app.core.logging_config import setup_json_logging
import logging

setup_json_logging()
logger = logging.getLogger("hakika")

# Sentry
if settings.sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=1.0)
    logger.info("Sentry enabled")

app = FastAPI(
    title="Hakika API",
    description="Hakika Version 1.0",
    version="0.1.0",
)

if settings.sentry_dsn:
    app.add_middleware(SentryAsgiMiddleware)

app.include_router(api_router, prefix="/api/v1")

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

@app.get("/")
async def root():
    return {"message": "Hakika API running"}
