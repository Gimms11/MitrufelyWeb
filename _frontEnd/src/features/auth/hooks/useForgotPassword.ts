import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth.api'

/**
 * Hook para solicitar el enlace de recuperación de contraseña.
 *
 * El backend responde siempre con 200 (anti-enumeración), por lo que
 * onSuccess indica únicamente que la petición se completó — no confirma
 * que el email exista. La confirmación visual genérica la maneja la página.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.requestPasswordReset(email),
  })
}
