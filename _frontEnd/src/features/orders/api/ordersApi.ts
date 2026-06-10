import api from '@/lib/axios'
import type { VentaResponse } from '../types'

export interface ListVentasParams {
  limit?: number
  offset?: number
}

export const ordersApi = {
  /**
   * Listar ventas del usuario actual (o del cliente autenticado)
   */
  listVentas: async (params: ListVentasParams = {}): Promise<VentaResponse[]> => {
    const { data } = await api.get<VentaResponse[]>('/ventas', { params })
    return data
  },

  /**
   * Obtener detalle de una venta por ID
   */
  getVenta: async (id: number): Promise<VentaResponse> => {
    const { data } = await api.get<VentaResponse>(`/ventas/${id}`)
    return data
  },

  /**
   * Confirmar el pago de una venta (Solo administradores / managers)
   */
  confirmarEntrega: async (id: number): Promise<VentaResponse> => {
    const { data } = await api.put<VentaResponse>(`/ventas/${id}/entregar`)
    return data
  },
}
