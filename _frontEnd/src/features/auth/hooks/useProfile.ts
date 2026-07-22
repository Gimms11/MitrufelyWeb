import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/app/store'
import { profileApi, type DatosFiscalesUpsert, type UserProfileUpdate, type ChangePasswordPayload } from '../api/profileApi'
import { authApi } from '../api/auth.api'

export const FISCAL_QUERY_KEY = ['datos-fiscales'] as const
export const PROFILE_QUERY_KEY = ['auth', 'me'] as const

export function useProfileData() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => authApi.getMe(),
    staleTime: 60_000,
  })
}

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
    onError: (error: any) => {
      const status = error?.response?.status
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.message

      if (
        status === 404 ||
        status === 409 ||
        status === 422 ||
        status === 400 ||
        !detail ||
        (typeof detail === 'string' &&
          (detail.toLowerCase().includes('registrado') ||
            detail.toLowerCase().includes('existe') ||
            detail.toLowerCase().includes('no disponible') ||
            detail.toLowerCase().includes('dni') ||
            detail.toLowerCase().includes('documento')))
      ) {
        toast.error('DNI no disponible')
      } else if (typeof detail === 'string' && detail.trim()) {
        toast.error(detail)
      } else {
        toast.error('DNI no disponible')
      }
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
    onError: (error: any) => {
      const status = error?.response?.status
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.message

      if (
        status === 404 ||
        status === 409 ||
        status === 422 ||
        (typeof detail === 'string' && detail.toLowerCase().includes('dni'))
      ) {
        toast.error('DNI no disponible')
      } else if (typeof detail === 'string' && detail.trim()) {
        toast.error(detail)
      } else {
        toast.error('No se pudo actualizar el perfil.')
      }
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordPayload) => profileApi.changePassword(data),
    onSuccess: () => {
      toast.success('Contraseña actualizada correctamente.')
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || 'Error al cambiar la contraseña.'
      toast.error(msg)
    },
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((s) => s.updateUser)

  return useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      updateUser({ avatarUrl: data.avatar_url })
    },
  })
}
