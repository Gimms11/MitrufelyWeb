"""
Mitrufely Web — Reports Module Router (Fase 7)
Expone los siete reportes funcionales en tres modalidades:

  1. JSON (datos para el frontend).
  2. Descarga directa PDF/Excel (síncrono, en memoria).
  3. Generación en segundo plano vía Celery (reportes pesados).

Y el reporte de Comprobantes Electrónicos (PDF por venta).
"""

import datetime as _dt
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.core.constants import Permission
from app.core.exceptions import MifrufelyBaseError, NotFoundError
from app.modules.reports.dependencies import ReportsServiceDep
from app.modules.reports.generators import (
    exportar_reporte_a_excel,
    exportar_reporte_a_pdf,
    generar_comprobante_pdf,
)
from app.modules.reports.schemas import ReporteTipo
from app.security.dependencies import AdminUser, require_permission

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/reports", tags=["Reportes y Exportaciones"])

# Permisos: lectura para ver/exportar reportes.
_READ_DEP = require_permission(Permission.REPORT_GENERATE)
_EXPORT_DEP = require_permission(Permission.REPORT_GENERATE)


# ── Helpers internos ──────────────────────────────────────────────────────────


def _fecha(desde: Optional[str], hasta: Optional[str]) -> tuple[_dt.date | None, _dt.date | None]:
    fd = _parse_date(desde)
    fh = _parse_date(hasta)
    return fd, fh


def _parse_date(s: Optional[str]) -> _dt.date | None:
    if not s:
        return None
    try:
        return _dt.date.fromisoformat(s)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Fecha inválida: '{s}'. Use ISO YYYY-MM-DD.",
        )


async def _compilar_reporte(
    service: ReportsServiceDep, tipo: ReporteTipo, *, fd, fh, estado_pago=None, estado=None, search=None
):
    """Despacha al método del servicio según el tipo de reporte."""
    if tipo == "ventas":
        return await service.reporte_ventas(fecha_desde=fd, fecha_hasta=fh, estado_pago=estado_pago)
    if tipo == "pedidos":
        return await service.reporte_pedidos(fecha_desde=fd, fecha_hasta=fh, estado=estado)
    if tipo == "catalogo":
        return await service.reporte_catalogo(search=search)
    if tipo == "inventario":
        return await service.reporte_inventario(solo_bajo_stock=False)
    if tipo == "usuarios":
        return await service.reporte_usuarios(rol=estado, search=search)
    if tipo == "fidelizacion":
        return await service.reporte_fidelizacion()
    raise HTTPException(status_code=400, detail=f"Reporte no soportado: {tipo}")


def _streaming_pdf(nombre: str, pdf_bytes: bytes) -> StreamingResponse:
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre}.pdf"'},
    )


def _streaming_xlsx(nombre: str, xlsx_bytes: bytes) -> StreamingResponse:
    return StreamingResponse(
        iter([xlsx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre}.xlsx"'},
    )


# ── 1) JSON: datos del reporte ────────────────────────────────────────────────


@router.get(
    "/{tipo}",
    summary="Obtener reporte en JSON",
    description=(
        "Devuelve los datos del reporte en JSON para renderizarlo en el frontend. "
        "Tipos: ventas, pedidos, catalogo, inventario, usuarios, fidelizacion."
    ),
    dependencies=[Depends(_READ_DEP)],
)
async def get_reporte_json(
    tipo: ReporteTipo,
    service: ReportsServiceDep,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    estado_pago: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    _: AdminUser = None,
):
    fd, fh = _fecha(fecha_desde, fecha_hasta)
    try:
        return await _compilar_reporte(
            service, tipo, fd=fd, fh=fh,
            estado_pago=estado_pago, estado=estado, search=search,
        )
    except MifrufelyBaseError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e


# ── 2) Descarga directa PDF ───────────────────────────────────────────────────


@router.get(
    "/{tipo}/pdf",
    summary="Descargar reporte en PDF",
    description="Genera y descarga el reporte en PDF (generación síncrona en memoria).",
    dependencies=[Depends(_EXPORT_DEP)],
)
async def get_reporte_pdf(
    tipo: ReporteTipo,
    service: ReportsServiceDep,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    estado_pago: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    _: AdminUser = None,
) -> StreamingResponse:
    fd, fh = _fecha(fecha_desde, fecha_hasta)
    try:
        data = await _compilar_reporte(
            service, tipo, fd=fd, fh=fh,
            estado_pago=estado_pago, estado=estado, search=search,
        )
    except MifrufelyBaseError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e

    try:
        pdf_bytes = exportar_reporte_a_pdf(tipo, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    fecha_stamp = _dt.datetime.now().strftime("%Y%m%d")
    return _streaming_pdf(f"reporte_{tipo}_{fecha_stamp}", pdf_bytes)


# ── 3) Descarga directa Excel ─────────────────────────────────────────────────


@router.get(
    "/{tipo}/excel",
    summary="Descargar reporte en Excel",
    description="Genera y descarga el reporte en .xlsx (generación síncrona en memoria).",
    dependencies=[Depends(_EXPORT_DEP)],
)
async def get_reporte_excel(
    tipo: ReporteTipo,
    service: ReportsServiceDep,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    estado_pago: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    _: AdminUser = None,
) -> StreamingResponse:
    fd, fh = _fecha(fecha_desde, fecha_hasta)
    try:
        data = await _compilar_reporte(
            service, tipo, fd=fd, fh=fh,
            estado_pago=estado_pago, estado=estado, search=search,
        )
    except MifrufelyBaseError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e

    try:
        xlsx_bytes = exportar_reporte_a_excel(tipo, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    fecha_stamp = _dt.datetime.now().strftime("%Y%m%d")
    return _streaming_xlsx(f"reporte_{tipo}_{fecha_stamp}", xlsx_bytes)


# ── 6) Comprobante electrónico PDF (por venta) ────────────────────────────────


@router.get(
    "/ventas/{id_venta}/comprobante.pdf",
    summary="Descargar comprobante electrónico (PDF)",
    description=(
        "Genera y descarga el comprobante de venta (BOLETA/FACTURA) en PDF. "
        "Incluye datos del cliente, productos, cantidades y total."
    ),
    dependencies=[Depends(require_permission(Permission.ORDER_READ_OWN))],
    response_class=StreamingResponse,
)
async def get_comprobante_pdf(
    id_venta: int,
    service: ReportsServiceDep,
    _: AdminUser = None,
) -> StreamingResponse:
    try:
        data = await service.obtener_venta_para_comprobante(id_venta)
        if data is None:
            raise NotFoundError(f"Venta {id_venta} no encontrada.")
    except MifrufelyBaseError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e

    try:
        pdf_bytes = generar_comprobante_pdf(data)
    except Exception as e:
        logger.error("reports.comprobante.pdf_failed", id_venta=id_venta, error=str(e))
        raise HTTPException(status_code=500, detail="Error generando el comprobante.") from e

    return _streaming_pdf(f"comprobante_venta_{id_venta}", pdf_bytes)
