import asyncio

import structlog
from sqlalchemy import text

from app.infrastructure.database.session import AsyncSessionFactory
from app.infrastructure.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


async def _run_expire_pending_ventas() -> int:
    async with AsyncSessionFactory() as session:
        async with session.begin():
            result = await session.execute(
                text("""
                    UPDATE ventas
                    SET estado = 'ANULADO'
                    WHERE estado = 'PENDIENTE'
                      AND estado_pago = 'PENDIENTE'
                      AND fecha_venta < NOW() - INTERVAL '15 minutes'
                """)
            )
            anuladas: int = result.rowcount
    return anuladas


@celery_app.task(
    name="app.infrastructure.workers.tasks.ventas.expire_pending",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
)
def expire_pending(self) -> dict:
    log = logger.bind(task="expire_pending_ventas", task_id=self.request.id)
    log.info("ventas.expire_pending.started")

    try:
        anuladas = asyncio.run(_run_expire_pending_ventas())
        log.info("ventas.expire_pending.completed", anuladas=anuladas)
        return {"status": "ok", "ventas_anuladas": anuladas}

    except Exception as exc:
        log.error("ventas.expire_pending.failed", error=str(exc))
        raise self.retry(exc=exc)
