import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { authApi, type RegisterPayload } from '../api/auth.api'
import type { AxiosError } from 'axios'

export function useRegister() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: () => {
      toast.success(
        '¡Registro exitoso! Te hemos enviado un enlace de verificación a tu correo. Por favor, activa tu cuenta antes de iniciar sesión.',
        { duration: 8000 }
      )
      navigate('/login')
    },
    onError: (error: unknown) => {
      const message = (error as AxiosError<{ error?: { message?: string } }>)?.response?.data?.error?.message || 'Error al crear la cuenta. Revisa los datos.'
      toast.error(message)
    },
  })
}
