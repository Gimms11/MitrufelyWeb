"""
Mifrufely Web — Internal Task Router

Endpoints called by Cloud Scheduler (crons) and Cloud Tasks (event-driven).
Protected by OIDC validation in production; open in development.

These endpoints replace Celery Beat schedule + Celery worker tasks.
"""

import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.modules.tasks.security import verify_cloud_task_origin

logger = structlog.get_logger(__name__)

router = APIRouter(
    prefix="/tasks",
    tags=["Internal Tasks"],
    dependencies=[Depends(verify_cloud_task_origin)],
)


# ── Response Model ────────────────────────────────────────────────────────────

class TaskResult(BaseModel):
    status: str = "ok"
    detail: str = ""


# ── Cron Endpoints (Cloud Scheduler) ─────────────────────────────────────────


@router.post("/expire-lots", response_model=TaskResult)
async def expire_lots_endpoint():
    """
    Expira lotes vencidos. Llamado por Cloud Scheduler diariamente.
    Invoca el SP sp_expirar_lotes_vencidos() en NeonDB.
    """
    from app.infrastructure.workers.tasks.inventory import _run_expire_lots

    log = logger.bind(task="expire_lots")
    log.info("tasks.expire_lots.started")

    lotes_expirados = await _run_expire_lots()
    log.info("tasks.expire_lots.completed", lotes_expirados=lotes_expirados)
    return TaskResult(detail=f"{lotes_expirados} lotes expirados")


@router.post("/expire-coupons", response_model=TaskResult)
async def expire_coupons_endpoint():
    """
    Expira cupones SweetCoins vencidos. Llamado por Cloud Scheduler diariamente.
    """
    from app.infrastructure.workers.tasks.sweetcoins import _run_expire_coupons

    log = logger.bind(task="expire_coupons")
    log.info("tasks.expire_coupons.started")

    cupones_expirados = await _run_expire_coupons()
    log.info("tasks.expire_coupons.completed", cupones_expirados=cupones_expirados)
    return TaskResult(detail=f"{cupones_expirados} cupones expirados")


@router.post("/expire-pending-ventas", response_model=TaskResult)
async def expire_pending_ventas_endpoint():
    """
    Anula ventas PENDIENTE >15min. Llamado por Cloud Scheduler cada 15 minutos.
    """
    from app.infrastructure.workers.tasks.ventas import _run_expire_pending_ventas

    log = logger.bind(task="expire_pending_ventas")
    log.info("tasks.expire_pending_ventas.started")

    anuladas = await _run_expire_pending_ventas()
    log.info("tasks.expire_pending_ventas.completed", anuladas=anuladas)
    return TaskResult(detail=f"{anuladas} ventas anuladas")


@router.post("/aggregate-daily", response_model=TaskResult)
async def aggregate_daily_endpoint():
    """
    Agrega analytics del día anterior. Llamado por Cloud Scheduler diariamente.
    """
    log = logger.bind(task="aggregate_daily")
    log.info("tasks.aggregate_daily.started")
    # TODO: Implement daily aggregation logic (stub — same as current Celery task)
    log.info("tasks.aggregate_daily.completed", note="stub")
    return TaskResult(detail="aggregation stub — not yet implemented")


# ── Event-Driven Endpoints (Cloud Tasks) ──────────────────────────────────────


class SendEmailPayload(BaseModel):
    """Payload for email dispatch via Cloud Tasks."""
    template: str  # "order_status" | "verification" | "password_reset"
    to_email: str
    data: dict = {}


@router.post("/send-email", response_model=TaskResult)
async def send_email_endpoint(payload: SendEmailPayload):
    """
    Envía un email. Llamado por Cloud Tasks para garantizar delivery.
    CPU de Cloud Run permanece activa hasta completar el envío.
    """
    from app.infrastructure.email.service import EmailService

    log = logger.bind(task="send_email", template=payload.template, to=payload.to_email)
    log.info("tasks.send_email.started")

    try:
        if payload.template == "order_status":
            await EmailService.send_order_status_email(
                to_email=payload.to_email,
                **payload.data,
            )
        elif payload.template == "verification":
            await EmailService.send_verification_email(
                to_email=payload.to_email,
                **payload.data,
            )
        elif payload.template == "password_reset":
            await EmailService.send_password_reset_email(
                to_email=payload.to_email,
                **payload.data,
            )
        else:
            log.warning("tasks.send_email.unknown_template", template=payload.template)
            return TaskResult(status="error", detail=f"Unknown template: {payload.template}")

        log.info("tasks.send_email.completed")
        return TaskResult(detail=f"Email {payload.template} sent to {payload.to_email}")
    except Exception as exc:
        log.error("tasks.send_email.failed", error=str(exc))
        # Return 500 so Cloud Tasks retries
        raise
