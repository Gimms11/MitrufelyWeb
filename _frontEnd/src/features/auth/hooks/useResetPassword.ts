import { useMutation } from '@tanstack/react-query'
import { authApi, type ResetPasswordPayload } from '../api/auth.api'

/**
 * Hook para restablecer la contraseña con un token válido.
 * Sin onSuccess/onError: la página maneja los estados directamente
 * (mismo patrón que useVerifyAccount).
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => authApi.resetPassword(payload),
  })
}
