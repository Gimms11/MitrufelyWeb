"""
Mitrufely Web — Reports Generators package.
Generadores de archivos descargables (PDF / Excel) para los reportes funcionales.
"""

from app.modules.reports.generators.excel_generator import (
    exportar_reporte_a_excel,
)
from app.modules.reports.generators.pdf_comprobante import (
    generar_comprobante_pdf,
)
from app.modules.reports.generators.pdf_generator import (
    exportar_reporte_a_pdf,
)

__all__ = [
    "exportar_reporte_a_pdf",
    "exportar_reporte_a_excel",
    "generar_comprobante_pdf",
]
