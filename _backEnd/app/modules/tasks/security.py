"""
Mifrufely Web — Task Endpoint Security (OIDC Validation)

In production: validates OIDC tokens from Cloud Tasks / Cloud Scheduler.
In development: bypasses authentication (allows direct calls).
"""

import structlog
from fastapi import Depends, HTTPException, Request, status

from app.core.config import settings

logger = structlog.get_logger(__name__)


async def verify_cloud_task_origin(request: Request) -> None:
    """
    FastAPI dependency that validates incoming task requests.

    Production: Checks for a valid OIDC bearer token in the Authorization header.
    Cloud Tasks and Cloud Scheduler automatically attach OIDC tokens when configured
    with a service account.

    Development: Skips validation entirely for local testing.
    """
    if not settings.is_production:
        return

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        logger.warning("task.auth.missing_token", path=request.url.path)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing or invalid authorization for internal task endpoint.",
        )

    token = auth_header.removeprefix("Bearer ")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        # Verify the OIDC token was issued by Google for our Cloud Run service
        claims = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience=settings.CLOUD_RUN_SERVICE_URL,
        )
        logger.debug(
            "task.auth.verified",
            email=claims.get("email"),
            path=request.url.path,
        )
    except Exception as exc:
        logger.warning("task.auth.invalid_token", error=str(exc), path=request.url.path)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid OIDC token for internal task endpoint.",
        ) from exc
