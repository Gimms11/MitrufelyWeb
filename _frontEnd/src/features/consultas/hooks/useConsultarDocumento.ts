/**
 * useConsultarDocumento — mutation TanStack para consultar DNI/RUC.
 */
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { consultasApi } from '../api/consultasApi'
import type { TipoDocumento } from '../types'

export function useConsultarDocumento() {
  return useMutation({
    mutationFn: ({ tipo, numero }: { tipo: TipoDocumento; numero: string }) =>
      consultasApi.lookupDocumento(tipo, numero),
    onError: (error: any) => {
      const status = error?.response?.status
      const msg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.detail ||
        error?.response?.data?.message

      if (status === 404) {
        toast.error('DNI no disponible')
      } else if (typeof msg === 'string' && msg.trim()) {
        toast.error(msg)
      } else {
        toast.error('DNI no disponible')
      }
    },
  })
}
