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
      // Update list caches
      queryClient.setQueriesData({ queryKey: ['orders'] }, (old: any) => {
        if (!old) return old
        if (Array.isArray(old)) {
          return old.map((order: any) =>
            order.id_venta === data.id_venta
              ? { ...order, estado: data.estado, estado_pago: data.estado_pago }
              : order
          )
        }
        return old
      })

      // Update detail cache
      queryClient.setQueryData(['orders', 'detail', data.id_venta], data)

      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', data.id_venta] })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success(`Venta #${data.id_venta} marcada como ENTREGADA ✨`)
    },
    onError: (error: unknown) => {
      const detail = formatErrorDetail(error, 'Error al confirmar la entrega.')
      toast.error(`Error: ${detail}`, { duration: 6000 })
    },
  })
}
