import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { profileApi, type DatosFiscalesUpsert, type UserProfileUpdate } from '../api/profileApi'

export const FISCAL_QUERY_KEY = ['datos-fiscales'] as const

export function useDatosFiscales() {
  return useQuery({
    queryKey: FISCAL_QUERY_KEY,
    queryFn: () => profileApi.getDatosFiscales(),
    staleTime: 60_000,
  })
}

export function useUpsertDatosFiscales() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: DatosFiscalesUpsert) => profileApi.upsertDatosFiscales(data),
    onSuccess: (data) => {
      queryClient.setQueryData(FISCAL_QUERY_KEY, data)
      toast.success('Datos fiscales guardados.')
    },
    onError: () => {
      toast.error('No se pudieron guardar los datos fiscales.')
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UserProfileUpdate) => profileApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      toast.success('Perfil actualizado.')
    },
    onError: () => {
      toast.error('No se pudo actualizar el perfil.')
    },
  })
}
