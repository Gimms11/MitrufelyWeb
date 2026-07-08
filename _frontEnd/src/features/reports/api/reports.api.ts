/**
 * API client del módulo de Reportes (Fase 7).
 * Cubre los siete reportes funcionales + comprobante PDF.
 */

import api from '@/lib/axios'
import type {
  ReporteFiltros,
  ReporteResponseMap,
  ReporteTipo,
} from '../types'

/** Convierte filtros a query params (omite vacíos). */
function toQuery(filtros?: ReporteFiltros): Record<string, string> {
  if (!filtros) return {}
  const q: Record<string, string> = {}
  if (filtros['fecha_desde']) q['fecha_desde'] = filtros['fecha_desde']
  if (filtros['fecha_hasta']) q['fecha_hasta'] = filtros['fecha_hasta']
  if (filtros['estado']) q['estado'] = filtros['estado']
  if (filtros['estado_pago']) q['estado_pago'] = filtros['estado_pago']
  if (filtros['search']) q['search'] = filtros['search']
  return q
}

export const reportsApi = {
  /** Obtiene el reporte en JSON. */
  async getReporte<T extends ReporteTipo>(
    tipo: T,
    filtros?: ReporteFiltros,
  ): Promise<ReporteResponseMap[T]> {
    const { data } = await api.get<ReporteResponseMap[T]>(
      `/reports/${tipo}`,
      { params: toQuery(filtros) },
    )
    return data
  },

  /** Descarga el reporte en PDF (generación en servidor con reportlab). */
  async descargarPdf(tipo: ReporteTipo, filtros?: ReporteFiltros): Promise<Blob> {
    const res = await api.get(`/reports/${tipo}/pdf`, {
      params: toQuery(filtros),
      responseType: 'blob',
    })
    return res.data as Blob
  },

  /** Descarga el reporte en Excel (generación en servidor con openpyxl). */
  async descargarExcel(tipo: ReporteTipo, filtros?: ReporteFiltros): Promise<Blob> {
    const res = await api.get(`/reports/${tipo}/excel`, {
      params: toQuery(filtros),
      responseType: 'blob',
    })
    return res.data as Blob
  },

  /** Descarga el comprobante electrónico (PDF) de una venta. */
  async descargarComprobante(idVenta: number): Promise<Blob> {
    const res = await api.get(`/reports/ventas/${idVenta}/comprobante.pdf`, {
      responseType: 'blob',
    })
    return res.data as Blob
  },
}

/** Utilidad: dispara la descarga de un Blob en el navegador. */
export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // revoca el objeto tras un pequeño delay para asegurar la descarga
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
