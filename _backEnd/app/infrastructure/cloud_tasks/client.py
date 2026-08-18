"""
Mifrufely Web — Cloud Tasks Client (Dual Mode)

Production: Enqueues HTTP tasks via Google Cloud Tasks SDK.
Development: Falls back to asyncio.create_task for local execution.

Usage:
    from app.infrastructure.cloud_tasks.client import enqueue_task
    enqueue_task("/api/v1/tasks/send-email", {"to": "x@y.com", ...})
"""

import json
from typing import Any

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


def _is_cloud_tasks_enabled() -> bool:
    """Cloud Tasks available only when GCP_PROJECT_ID is configured."""
    return bool(settings.GCP_PROJECT_ID and settings.CLOUD_RUN_SERVICE_URL)


def enqueue_task(
    path: str,
    payload: dict[str, Any],
    *,
    queue: str | None = None,
    delay_seconds: int = 0,
) -> str | None:
    """
    Enqueue an HTTP POST task to be processed by Cloud Run.

    Args:
        path: Relative URL path (e.g. "/api/v1/tasks/send-email").
        payload: JSON-serializable dict to send as request body.
        queue: Override queue name. Defaults to settings.CLOUD_TASKS_QUEUE.
        delay_seconds: Delay before task execution.

    Returns:
        Task name (GCP) or None (dev fallback).
    """
    if not _is_cloud_tasks_enabled():
        logger.debug("cloud_tasks.disabled", path=path, reason="no GCP_PROJECT_ID")
        return None

    from google.cloud import tasks_v2
    from google.protobuf import timestamp_pb2
    import datetime

    client = tasks_v2.CloudTasksClient()
    queue_name = queue or settings.CLOUD_TASKS_QUEUE
    parent = client.queue_path(
        settings.GCP_PROJECT_ID,
        settings.CLOUD_TASKS_LOCATION,
        queue_name,
    )

    url = f"{settings.CLOUD_RUN_SERVICE_URL.rstrip('/')}{path}"
    body = json.dumps(payload).encode("utf-8")

    http_request: dict[str, Any] = {
        "http_method": tasks_v2.HttpMethod.POST,
        "url": url,
        "headers": {"Content-Type": "application/json"},
        "body": body,
    }

    # OIDC token for authenticated Cloud Run invocation
    if settings.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL:
        http_request["oidc_token"] = {
            "service_account_email": settings.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL,
            "audience": settings.CLOUD_RUN_SERVICE_URL,
        }

    task: dict[str, Any] = {"http_request": http_request}

    if delay_seconds > 0:
        d = datetime.datetime.now(datetime.UTC) + datetime.timedelta(seconds=delay_seconds)
        ts = timestamp_pb2.Timestamp()
        ts.FromDatetime(d)
        task["schedule_time"] = ts

    response = client.create_task(parent=parent, task=task)
    logger.info(
        "cloud_tasks.enqueued",
        path=path,
        task_name=response.name,
        delay=delay_seconds,
    )
    return response.name


async def enqueue_task_or_run_locally(
    path: str,
    payload: dict[str, Any],
    *,
    local_handler=None,
) -> None:
    """
    Production: enqueue via Cloud Tasks.
    Development: execute local_handler directly if provided.

    Args:
        path: Task endpoint path.
        payload: Task payload.
        local_handler: Async callable to run in dev mode. Receives payload as arg.
    """
    if _is_cloud_tasks_enabled():
        enqueue_task(path, payload)
    elif local_handler is not None:
        import asyncio
        task = asyncio.create_task(local_handler(payload))
        # ponytail: fire-and-forget, no await needed in dev
        task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)
        logger.debug("cloud_tasks.local_fallback", path=path)
    else:
        logger.warning("cloud_tasks.no_handler", path=path)
