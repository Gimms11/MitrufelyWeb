/**
 * Hooks TanStack Query para el módulo de Usuarios (Fase 7).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { usersApi } from '../api/users.api'
import type { UsuariosFiltros } from '../types'

export const useUsersQuery = (filtros?: UsuariosFiltros) =>
  useQuery({
    queryKey: ['users', filtros],
    queryFn: () => usersApi.listar(filtros),
    placeholderData: (prev) => prev,
  })

export const useToggleUserEstadoMutation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: boolean }) =>
      usersApi.actualizarEstado(id, estado),
    onSuccess: (usuario) => {
      toast.success(
        usuario.estado
          ? `Cuenta de ${usuario.nombres} activada`
          : `Cuenta de ${usuario.nombres} desactivada`,
      )
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'No se pudo actualizar el estado del usuario'
      toast.error(msg)
    },
  })
}
