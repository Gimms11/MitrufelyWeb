/**
 * useLogout — Hook que centraliza el cierre de sesión.
 *
 * Resuelve H-06 (CWE-613): antes, todos los componentes llamaban solo al
 * `logout()` local del store, que limpia memoria/sessionStorage pero NO
 * invalida el refresh token en el servidor. Como resultado, un refresh
 * token exfiltrado seguía válido hasta 7 días.
 *
 * Ahora este hook:
 *   1. Llama a `authApi.logout()` (POST /auth/logout) → el backend añade
 *      el access token a la blocklist de Redis (revocación inmediata).
 *   2. Limpia el store local (memoria + sessionStorage).
 *   3. Es tolerante a fallos de red: si el POST falla, igual limpia el
 *      store local para que el usuario pueda cerrar sesión offline.
 */
import { useCallback } from 'react'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { authApi } from '@/features/auth/api/auth.api'

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)

  return useCallback(async (): Promise<void> => {
    // Intentar invalidar el token en el backend (best-effort).
    // Si falla (red caída, token ya expirado, etc.), igual limpiamos local.
    try {
      await authApi.logout()
    } catch {
      // Silencioso: el token puede ya estar expirado o la red caída.
      // Lo importante es que el usuario pueda cerrar sesión localmente.
    }
    // Limpiar el store local (memoria + sessionStorage)
    logout()
  }, [logout])
}
