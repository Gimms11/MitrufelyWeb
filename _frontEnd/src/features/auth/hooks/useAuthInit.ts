/**
 * useAuthInit — Rehidrata el accessToken al cargar/recargar la app.
 *
 * PROBLEMA RAIZ:
 *   El accessToken vive solo en memoria (axios.ts). Al recargar la página,
 *   React reinicia y el token desaparece, aunque isAuthenticated y refreshToken
 *   estén persistidos en sessionStorage.
 *
 * SOLUCIÓN:
 *   Al montar la app por primera vez, si hay sesión guardada con refreshToken,
 *   llamamos silenciosamente a /auth/refresh para recuperar el accessToken.
 *
 * FIX CRÍTICO — React StrictMode:
 *   En desarrollo, StrictMode monta/desmonta/remonta los componentes dos veces.
 *   Si el backend hace token-rotation (invalida el refresh token al usarlo),
 *   la segunda llamada al endpoint usaría un token ya invalidado → logout forzado.
 *
 *   Usamos una variable de módulo (`initStarted`) como semáforo global para
 *   garantizar que la llamada a /auth/refresh ocurra UNA SOLA VEZ por ciclo
 *   de vida de la página, independientemente del doble-mount de StrictMode.
 */
import { useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuthStore } from '@/app/store'
import { setAccessToken } from '@/lib/axios'

const BASE_URL = import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:8000/api/v1'

// ── Semáforo de módulo: garantiza que el refresh solo ocurra UNA vez por carga ─
// Al ser una variable de módulo (fuera del componente), sobrevive al doble-mount
// de React StrictMode. Se resetea cuando la página se recarga completamente.
let initStarted = false

export function useAuthInit() {
  const { isAuthenticated, refreshToken, logout, setRefreshToken, setInitialized } = useAuthStore()
  // Ref para evitar que el cleanup cancele la llamada en el doble-mount de StrictMode
  const promiseRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    // Si ya iniciamos el proceso (doble-mount de StrictMode), no repetir
    if (initStarted) return

    // Caso 1: Sin sesión activa → nada que rehidratar
    if (!isAuthenticated) {
      initStarted = true
      setInitialized(true)
      return
    }

    // Caso 2: Sesión activa pero sin refreshToken (datos de sesión anterior al fix).
    // No se puede recuperar el accessToken → limpiar silenciosamente para evitar
    // que el interceptor de axios fuerce un logout inesperado en la primera llamada.
    if (!refreshToken) {
      initStarted = true
      logout()
      return
    }

    // Marcar que iniciamos — bloquea la segunda ejecución de StrictMode
    initStarted = true

    // Hay sesión persistida → recuperar el accessToken silenciosamente
    promiseRef.current = axios
      .post<{ access_token: string; refresh_token?: string }>(
        `${BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        { withCredentials: true },
      )
      .then(({ data }) => {
        setAccessToken(data.access_token)
        if (data.refresh_token) {
          setRefreshToken(data.refresh_token)
        }
        setInitialized(true)
      })
      .catch((err) => {
        // Solo cerrar sesión si el error es de autenticación (401/403/400)
        // Si es error de red o servidor (5xx), mantener la sesión y marcar como inicializado
        // para no bloquear la app — el usuario podrá intentar usar la app y la pantalla
        // de login aparecerá naturalmente si intenta acceder a rutas protegidas.
        const status = err?.response?.status
        if (status === 401 || status === 403 || status === 400) {
          // Token genuinamente expirado o inválido
          logout()
        } else {
          // Error de red, servidor caído, CORS, etc. — no cerrar sesión
          // El interceptor de axios manejará el 401 cuando el usuario haga la primera acción
          setInitialized(true)
        }
      })

    // Sin cleanup que cancele: dejamos que la promesa corra incluso si StrictMode desmonta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
