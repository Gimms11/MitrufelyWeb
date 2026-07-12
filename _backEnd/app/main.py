"""
Mifrufely Web — FastAPI Application Entry Point
Async-first | Enterprise-scale | Clean Architecture
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.logging import configure_logging
from app.infrastructure.database.session import database_engine
from app.middleware.exception_handler import register_exception_handlers
from app.middleware.request_id import RequestIDMiddleware
from app.routers import api_router

logger = structlog.get_logger(__name__)

# ── Rate Limiter global (H-03: CWE-770) ──────────────────────────────────────
# slowapi con backend en memoria para desarrollo. En producción, configurar
# Redis como storage_uri para compartir contadores entre workers.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    storage_uri=settings.REDIS_URL,
)


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup & shutdown events."""
    configure_logging()
    logger.info(
        "application.startup",
        app=settings.APP_NAME,
        env=settings.APP_ENV,
        version=settings.APP_VERSION,
    )
    # Database connection pool is initialized on first use via async engine
    yield
    await database_engine.dispose()
    logger.info("application.shutdown", app=settings.APP_NAME)


def create_application() -> FastAPI:
    """Application factory — returns a fully configured FastAPI instance."""

    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Plataforma transaccional de pastelería — API REST Enterprise",
        docs_url="/api/docs" if settings.expose_docs else None,
        redoc_url="/api/redoc" if settings.expose_docs else None,
        openapi_url="/api/openapi.json" if settings.expose_docs else None,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    # ── Middleware Stack (order matters: outermost executes first) ─────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=settings.ALLOWED_METHODS,
        allow_headers=settings.ALLOWED_HEADERS,
    )
    application.add_middleware(GZipMiddleware, minimum_size=1000)
    application.add_middleware(RequestIDMiddleware)

    # ── Security Headers Middleware (ZAP-2: CWE-693) ──────────────────────────
    # Agrega cabeceras de seguridad estándar a TODAS las respuestas:
    # X-Content-Type-Options, X-Frame-Options, HSTS, CSP, Referrer-Policy, etc.
    from app.middleware.security_headers import SecurityHeadersMiddleware

    application.add_middleware(SecurityHeadersMiddleware)

    # ── Exception Handlers ────────────────────────────────────────────────────
    register_exception_handlers(application)

    # ── Rate Limiting (H-03): registro del limiter y su handler ───────────────
    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── Routers ───────────────────────────────────────────────────────────────
    application.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return application


app: FastAPI = create_application()
