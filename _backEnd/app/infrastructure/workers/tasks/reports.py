"""
Mitrufely Web — Report generation tasks (Celery) — Fase 7
Generación asíncrona de PDF / Excel en segundo plano para reportes pesados.

Patrón: tarea Celery SÍNCRONA (def) que envuelve un helper async con
`asyncio.run`, abriendo sesión vía `AsyncSessionFactory` (patrón del proyecto).
"""

import asyncio
import io

import structlog

from app.infrastructure.database.session import AsyncSessionFactory
from app.infrastructure.workers.celery_app import celery_app
from app.modules.reports.generators import exportar_reporte_a_excel, exportar_reporte_a_pdf
from app.modules.reports.service import ReportsService

logger = structlog.get_logger(__name__)


async def _run_generar_pdf(reporte_tipo: str, filtros: dict) -> dict:
    """Genera el PDF en memoria y reporta el tamaño (no guarda a disco)."""
    async with AsyncSessionFactory() as session:
        service = ReportsService(session=session)
        data = await _compilar(service, reporte_tipo, filtros)
        pdf_bytes = exportar_reporte_a_pdf(reporte_tipo, data)
        return {
            "status": "ok",
            "reporte": reporte_tipo,
            "formato": "pdf",
            "size_bytes": len(pdf_bytes),
        }


async def _run_generar_excel(reporte_tipo: str, filtros: dict) -> dict:
    async with AsyncSessionFactory() as session:
        service = ReportsService(session=session)
        data = await _compilar(service, reporte_tipo, filtros)
        xlsx_bytes = exportar_reporte_a_excel(reporte_tipo, data)
        return {
            "status": "ok",
            "reporte": reporte_tipo,
            "formato": "xlsx",
            "size_bytes": len(xlsx_bytes),
        }


async def _compilar(service: ReportsService, reporte_tipo: str, filtros: dict):
    """Despacha al método de ReportsService según el tipo de reporte."""
    fd = filtros.get("fecha_desde")
    fh = filtros.get("fecha_hasta")
    # Convertir strings ISO → date si vinieron
    import datetime as _dt

    def _to_date(s):
        return _dt.date.fromisoformat(s) if s else None

    fd, fh = _to_date(fd), _to_date(fh)
    estado = filtros.get("estado")
    estado_pago = filtros.get("estado_pago")
    search = filtros.get("search")

    if reporte_tipo == "ventas":
        return await service.reporte_ventas(fecha_desde=fd, fecha_hasta=fh, estado_pago=estado_pago)
    if reporte_tipo == "pedidos":
        return await service.reporte_pedidos(fecha_desde=fd, fecha_hasta=fh, estado=estado)
    if reporte_tipo == "catalogo":
        return await service.reporte_catalogo(search=search)
    if reporte_tipo == "inventario":
        return await service.reporte_inventario(solo_bajo_stock=False)
    if reporte_tipo == "usuarios":
        return await service.reporte_usuarios(rol=estado, search=search)
    if reporte_tipo == "fidelizacion":
        return await service.reporte_fidelizacion()
    raise ValueError(f"Reporte no soportado: {reporte_tipo}")


# ── Tareas públicas ───────────────────────────────────────────────────────────


@celery_app.task(
    bind=True,
    name="app.infrastructure.workers.tasks.reports.generate_sales_pdf",
    max_retries=3,
    default_retry_delay=60,
)
def generate_sales_pdf(self, report_params: dict) -> dict:
    """
    Genera un reporte PDF en segundo plano.

    `report_params` = {
        "tipo": "ventas" | "pedidos" | "catalogo" | "inventario" | "usuarios" | "fidelizacion",
        "filtros": { "fecha_desde": "...", "fecha_hasta": "...", "estado": "...", ... }
    }
    """
    log = logger.bind(task="generate_sales_pdf", task_id=self.request.id, params=report_params)
    log.info("reports.generate_sales_pdf.started")
    try:
        tipo = report_params.get("tipo", "ventas")
        filtros = report_params.get("filtros", {})
        return asyncio.run(_run_generar_pdf(tipo, filtros))
    except Exception as exc:
        log.error("reports.generate_sales_pdf.failed", error=str(exc))
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="app.infrastructure.workers.tasks.reports.export_inventory_excel",
    max_retries=3,
    default_retry_delay=60,
)
def export_inventory_excel(self, filters: dict) -> dict:
    """
    Genera un reporte Excel en segundo plano.

    `filters` = {
        "tipo": "inventario" | "ventas" | ...,
        "filtros": { ... }
    }
    Mantiene el nombre histórico `export_inventory_excel` pero ahora es genérico.
    """
    log = logger.bind(task="export_inventory_excel", task_id=self.request.id, filters=filters)
    log.info("reports.export_inventory_excel.started")
    try:
        tipo = filters.get("tipo", "inventario")
        filtros = filters.get("filtros", {})
        return asyncio.run(_run_generar_excel(tipo, filtros))
    except Exception as exc:
        log.error("reports.export_inventory_excel.failed", error=str(exc))
        raise self.retry(exc=exc)
