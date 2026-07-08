"""
Mitrufely Web — PDF Generator (Fase 7)
Genera reportes tabulares en PDF usando `reportlab` (100% Python, multiplataforma).

Por qué reportlab y no WeasyPrint:
  WeasyPrint requiere bindings nativos (GTK2/Pango/Cairo) que no son portables en
  Windows sin instalar runtimes adicionales. reportlab es puro Python y produce
  PDFs con tipografía y tablas profesionales sin dependencias externas.

Paleta de marca (vino + acento naranja), consistente con el frontend.
"""

from __future__ import annotations

import io
from decimal import Decimal
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.modules.reports.schemas import (
    ReporteCatalogoResponse,
    ReporteFidelizacionResponse,
    ReporteInventarioResponse,
    ReportePedidosResponse,
    ReporteUsuariosResponse,
    ReporteVentasResponse,
)

# ── Paleta de marca ───────────────────────────────────────────────────────────

VINO = colors.HexColor("#5c0f1b")
VINO_OSCURO = colors.HexColor("#7a1525")
NARANJA = colors.HexColor("#ff7a45")
TEXTO = colors.HexColor("#2a1115")
GRIS_CLARO = colors.HexColor("#faf8f5")
GRIS_BORDE = colors.HexColor("#e7e5e4")

# ── Estilos ───────────────────────────────────────────────────────────────────


def _build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()["Normal"]
    return {
        "titulo": ParagraphStyle(
            "Titulo", parent=base, fontName="Helvetica-Bold",
            fontSize=18, textColor=VINO, spaceAfter=4, leading=22,
        ),
        "subtitulo": ParagraphStyle(
            "Subtitulo", parent=base, fontName="Helvetica",
            fontSize=10, textColor=TEXTO, spaceAfter=2, leading=13,
        ),
        "kpi_label": ParagraphStyle(
            "KpiLabel", parent=base, fontName="Helvetica",
            fontSize=8, textColor=colors.HexColor("#888"), alignment=1,
        ),
        "kpi_value": ParagraphStyle(
            "KpiValue", parent=base, fontName="Helvetica-Bold",
            fontSize=12, textColor=VINO, alignment=1,
        ),
        "cell": ParagraphStyle(
            "Cell", parent=base, fontName="Helvetica",
            fontSize=8, textColor=TEXTO, leading=10,
        ),
        "cell_bold": ParagraphStyle(
            "CellBold", parent=base, fontName="Helvetica-Bold",
            fontSize=8, textColor=TEXTO, leading=10,
        ),
    }


def _footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#999"))
    canvas.drawString(
        2 * cm, 1 * cm,
        f"MitrufelyWeb · Reporte generado el "
        f"{doc._generation_time}",  # type: ignore[attr-defined]
    )
    canvas.drawRightString(
        landscape(A4)[0] - 2 * cm, 1 * cm, f"Página {doc.page}"
    )
    canvas.restoreState()


def _money(value) -> str:
    try:
        return f"S/ {Decimal(str(value)).quantize(Decimal('0.01'))}"
    except Exception:
        return str(value)


def _build_doc(buffer: io.BytesIO, titulo: str) -> SimpleDocTemplate:
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.8 * cm,
        title=titulo,
        author="MitrufelyWeb",
    )
    import datetime as _dt
    doc._generation_time = _dt.datetime.now().strftime("%d/%m/%Y %H:%M")  # type: ignore[attr-defined]
    return doc


def _encabezado(story, styles, titulo: str, subtitulo: str) -> None:
    story.append(Paragraph(titulo, styles["titulo"]))
    story.append(Paragraph(subtitulo, styles["subtitulo"]))
    story.append(Spacer(1, 0.4 * cm))


def _kpi_card(styles, label: str, value: str):
    return [
        Paragraph(label.upper(), styles["kpi_label"]),
        Paragraph(value, styles["kpi_value"]),
    ]


def _tabla(story, styles, headers: list[str], filas: list[list[str]], col_widths: list[float]) -> None:
    data = [[Paragraph(str(h), styles["cell_bold"]) for h in headers]]
    for fila in filas:
        data.append([Paragraph(str(c), styles["cell"]) for c in fila])

    tabla = Table(data, colWidths=col_widths, repeatRows=1)
    tabla.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), VINO),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GRIS_CLARO]),
                ("GRID", (0, 0), (-1, -1), 0.25, GRIS_BORDE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 1), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
            ]
        )
    )
    story.append(tabla)


# ── Exportadores públicos ─────────────────────────────────────────────────────


def exportar_reporte_a_pdf(reporte_tipo: str, data) -> bytes:
    """
    Punto de entrada único: serializa cualquier reporte (DTO Response) a PDF.
    `reporte_tipo` ∈ {ventas, pedidos, catalogo, inventario, usuarios, fidelizacion}.
    Retorna los bytes del PDF.
    """
    buffer = io.BytesIO()
    styles = _build_styles()

    if reporte_tipo == "ventas":
        _pdf_ventas(buffer, styles, data)
    elif reporte_tipo == "pedidos":
        _pdf_pedidos(buffer, styles, data)
    elif reporte_tipo == "catalogo":
        _pdf_catalogo(buffer, styles, data)
    elif reporte_tipo == "inventario":
        _pdf_inventario(buffer, styles, data)
    elif reporte_tipo == "usuarios":
        _pdf_usuarios(buffer, styles, data)
    elif reporte_tipo == "fidelizacion":
        _pdf_fidelizacion(buffer, styles, data)
    else:
        raise ValueError(f"Tipo de reporte no soportado: {reporte_tipo}")

    return buffer.getvalue()


# ── Implementaciones por reporte ──────────────────────────────────────────────


def _pdf_ventas(buffer, styles, r: ReporteVentasResponse) -> None:
    doc = _build_doc(buffer, "Reporte de Rendimiento de Ventas")
    story = []
    _encabezado(
        story, styles,
        "Reporte de Rendimiento de Ventas",
        "Comportamiento económico · productos más vendidos · métodos de pago.",
    )
    # KPIs
    kpis = Table(
        [[
            _kpi_card(styles, "Total ventas", _money(r.total_ventas)),
            _kpi_card(styles, "Pedidos", str(r.cantidad_pedidos)),
            _kpi_card(styles, "Ticket promedio", _money(r.ticket_promedio)),
        ]],
        colWidths=[8 * cm, 8 * cm, 8 * cm],
    )
    kpis.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0, colors.transparent)]))
    story.append(kpis)
    story.append(Spacer(1, 0.4 * cm))

    headers = ["ID", "Fecha", "Cliente", "Estado", "Pago", "Base", "IGV", "Total", "M. Pago"]
    filas = [
        [
            it.id_venta, it.fecha_venta.strftime("%d/%m/%Y %H:%M"),
            it.cliente[:30], it.estado, it.estado_pago,
            _money(it.base_imponible), _money(it.igv), _money(it.total),
            it.metodo_pago or "—",
        ]
        for it in r.items
    ]
    _tabla(
        story, styles, headers, filas,
        [1.4 * cm, 3.2 * cm, 5.5 * cm, 2.6 * cm, 2.4 * cm, 2.6 * cm, 2.4 * cm, 2.8 * cm, 2.6 * cm],
    )
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)


def _pdf_pedidos(buffer, styles, r: ReportePedidosResponse) -> None:
    doc = _build_doc(buffer, "Reporte de Seguimiento de Pedidos")
    story = []
    _encabezado(
        story, styles,
        "Reporte de Seguimiento de Pedidos",
        "Estado de pedidos · pendientes / completados / entregados.",
    )
    resumen = " · ".join(f"{k}: {v}" for k, v in r.por_estado.items()) or "Sin datos"
    story.append(Paragraph(f"<b>Distribución por estado:</b> {resumen}", styles["subtitulo"]))
    story.append(Spacer(1, 0.3 * cm))

    headers = ["ID", "Cliente", "Estado", "Pago", "Fecha venta", "Entregado", "Total"]
    filas = [
        [
            it.id_venta, it.cliente[:30],
            it.estado, it.estado_pago,
            it.fecha_venta.strftime("%d/%m/%Y %H:%M"),
            (it.delivery_completed_at.strftime("%d/%m/%Y") if it.delivery_completed_at else "—"),
            _money(it.total_final),
        ]
        for it in r.items
    ]
    _tabla(
        story, styles, headers, filas,
        [1.4 * cm, 5.5 * cm, 2.8 * cm, 2.6 * cm, 3.2 * cm, 2.8 * cm, 2.8 * cm],
    )
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)


def _pdf_catalogo(buffer, styles, r: ReporteCatalogoResponse) -> None:
    doc = _build_doc(buffer, "Reporte de Catálogo Comercial")
    story = []
    _encabezado(
        story, styles,
        "Reporte de Catálogo Comercial",
        "Productos registrados · estado · detección de inactivos.",
    )
    story.append(Paragraph(
        f"Total: {r.total_productos} · Activos: {r.productos_activos} · "
        f"Inactivos: {r.productos_inactivos}",
        styles["subtitulo"],
    ))
    story.append(Spacer(1, 0.3 * cm))

    headers = ["ID", "Nombre", "Categoría", "Precio", "Stock", "Estado"]
    filas = [
        [
            it.id_producto, it.nombre[:35], it.categoria or "—",
            _money(it.precio), it.stock_actual,
            "Activo" if it.estado else "Inactivo",
        ]
        for it in r.items
    ]
    _tabla(
        story, styles, headers, filas,
        [1.4 * cm, 7 * cm, 5 * cm, 3 * cm, 2.5 * cm, 3 * cm],
    )
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)


def _pdf_inventario(buffer, styles, r: ReporteInventarioResponse) -> None:
    doc = _build_doc(buffer, "Reporte de Control de Inventario")
    story = []
    _encabezado(
        story, styles,
        "Reporte de Control de Inventario",
        "Stock disponible · productos agotados o con bajo stock · valorización.",
    )
    story.append(Paragraph(
        f"Productos: {r.total_productos} · Bajo stock: {r.productos_bajo_stock} · "
        f"Agotados: {r.productos_agotados} · Valor inventario: {_money(r.valor_inventario)}",
        styles["subtitulo"],
    ))
    story.append(Spacer(1, 0.3 * cm))

    headers = ["ID", "Nombre", "Categoría", "Stock", "Mínimo", "Estado stock", "Valorización"]
    filas = [
        [
            it.id_producto, it.nombre[:30], it.categoria or "—",
            it.stock_actual, it.stock_minimo, it.estado_stock, _money(it.valorizacion),
        ]
        for it in r.items
    ]
    _tabla(
        story, styles, headers, filas,
        [1.4 * cm, 6 * cm, 4.5 * cm, 2.2 * cm, 2.2 * cm, 3 * cm, 3.2 * cm],
    )
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)


def _pdf_usuarios(buffer, styles, r: ReporteUsuariosResponse) -> None:
    doc = _build_doc(buffer, "Reporte de Gestión de Usuarios")
    story = []
    _encabezado(
        story, styles,
        "Reporte de Gestión de Usuarios",
        "Personas registradas · roles · estado de cuentas · actividad.",
    )
    story.append(Paragraph(
        f"Total: {r.total_usuarios} · Activos: {r.activos} · Inactivos: {r.inactivos}",
        styles["subtitulo"],
    ))
    story.append(Spacer(1, 0.3 * cm))

    headers = ["ID", "Nombres", "Apellidos", "Email", "Rol", "Estado", "Auth"]
    filas = [
        [
            it.id_usuario, it.nombres[:20], it.apellidos[:20],
            it.email[:30], it.rol,
            "Activo" if it.estado else "Inactivo", it.auth_provider,
        ]
        for it in r.items
    ]
    _tabla(
        story, styles, headers, filas,
        [1.2 * cm, 4 * cm, 4 * cm, 6 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm],
    )
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)


def _pdf_fidelizacion(buffer, styles, r: ReporteFidelizacionResponse) -> None:
    doc = _build_doc(buffer, "Reporte de Fidelización SweetCoins / CriptoTrufa")
    story = []
    _encabezado(
        story, styles,
        "Reporte de Fidelización SweetCoins / CriptoTrufa",
        "Puntos acumulados · utilizados · próximos a vencer.",
    )
    story.append(Paragraph(
        f"Clientes: {r.total_clientes} · Puntos en circulación: {r.puntos_circulacion}",
        styles["subtitulo"],
    ))
    story.append(Spacer(1, 0.3 * cm))

    headers = ["ID", "Cliente", "Email", "Saldo puntos", "Puntos usados"]
    filas = [
        [it.id_cliente, it.cliente[:30], it.email[:30], it.saldo_puntos, it.puntos_usados]
        for it in r.items
    ]
    _tabla(
        story, styles, headers, filas,
        [1.4 * cm, 6 * cm, 7 * cm, 4 * cm, 4 * cm],
    )
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
