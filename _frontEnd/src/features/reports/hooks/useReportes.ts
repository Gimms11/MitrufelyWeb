/**
 * Hooks TanStack Query para los reportes del backend (Fase 7).
 * Un hook genérico por tipo de reporte, todos consumen `reportsApi.getReporte`.
 */

import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api/reports.api'
import type { ReporteFiltros, ReporteTipo } from '../types'

/**
 * Hook genérico tipado para cualquier reporte.
 * El queryKey incluye el tipo y los filtros para cacheo fino.
 */
export function useReporteQuery<T extends ReporteTipo>(
  tipo: T,
  filtros?: ReporteFiltros,
  enabled = true,
) {
  return useQuery({
    queryKey: ['reporte', tipo, filtros],
    queryFn: () => reportsApi.getReporte(tipo, filtros),
    enabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

// Atajos tipados por reporte (comodidad para los componentes).
export const useReporteVentas = (filtros?: ReporteFiltros) =>
  useReporteQuery('ventas', filtros)

export const useReportePedidos = (filtros?: ReporteFiltros) =>
  useReporteQuery('pedidos', filtros)

export const useReporteCatalogo = (filtros?: ReporteFiltros) =>
  useReporteQuery('catalogo', filtros)

export const useReporteInventario = () => useReporteQuery('inventario')

export const useReporteUsuarios = (filtros?: ReporteFiltros) =>
  useReporteQuery('usuarios', filtros)

export const useReporteFidelizacion = () => useReporteQuery('fidelizacion')

/** Tipo de retorno útil para los componentes. */
export type ReporteQueryResult<T extends ReporteTipo> = ReturnType<
  typeof useReporteQuery<T>
>
