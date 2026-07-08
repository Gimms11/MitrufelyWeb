import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, type ListVentasParams } from '../api/ordersApi'
import { toast } from 'sonner'

// Helper for formatting error messages from API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatErrorDetail = (error: any, defaultMsg: string): string => {
  const detail = error?.response?.data?.detail
  if (!detail) return defaultMsg
  if (Array.isArray(detail)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return detail.map((err: any) => err.msg || err).join(', ')
  }
  if (typeof detail === 'string') return detail
  return defaultMsg
}

/**
 * Hook para listar las ventas del usuario actual.
 */
export const useOrdersQuery = (params: ListVentasParams = {}) => {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.listVentas(params),
    placeholderData: (prev) => prev,
  })
}

/**
 * Hook para obtener el detalle de una venta por ID.
 */
export const useOrderDetailQuery = (id: number | null) => {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => ordersApi.getVenta(id!),
    enabled: id !== null && !isNaN(id),
  })
}

/**
 * Hook para confirmar el pago de una venta.
 */
export const useConfirmEntregaMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => ordersApi.confirmarEntrega(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', data.id_venta] })
      toast.success(`Venta #${data.id_venta} marcada como ENTREGADA ✨`)
    },
    onError: (error: unknown) => {
      const detail = formatErrorDetail(error, 'Error al confirmar la entrega.')
      toast.error(`Error: ${detail}`, { duration: 6000 })
    },
  })
}

export const useTransitionVentaMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, payload }: { id: number, action: string, payload?: any }) => {
      switch (action) {
        case 'pagar': return ordersApi.pagar(id)
        case 'preparar': return ordersApi.preparar(id)
        case 'despachar': return ordersApi.despachar(id)
        case 'entregar': return ordersApi.confirmarEntrega(id)
        case 'cancelar': return ordersApi.cancelar(id, payload)
        case 'devolver': return ordersApi.devolver(id, payload)
        case 'reembolsar': return ordersApi.reembolsar(id, payload)
        default: throw new Error('Acción no válida')
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', data.id_venta] })
      const mensajes: Record<string, string> = {
        pagar: `Venta #${data.id_venta} marcada como PAGADA 💰`,
        preparar: `Venta #${data.id_venta} en PREPARACIÓN 👨‍🍳`,
        despachar: `Venta #${data.id_venta} despachada (EN CAMINO) 🛵`,
        entregar: `Venta #${data.id_venta} marcada como ENTREGADA ✨`,
        cancelar: `Venta #${data.id_venta} CANCELADA — stock reintegrado`,
        devolver: `Venta #${data.id_venta} marcada como DEVUELTA 📦`,
        reembolsar: `Reembolso procesado para la venta #${data.id_venta} 💸`,
      }
      toast.success(mensajes[variables.action] ?? `Transición aplicada a la venta #${data.id_venta}`)
    },
    onError: (error: unknown) => {
      const detail = formatErrorDetail(error, 'Error al procesar la transición.')
      toast.error(`Error: ${detail}`, { duration: 6000 })
    },
  })
}
