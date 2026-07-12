import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { User } from '@/shared/types/auth.types'
import { setAccessToken, registerLogoutCallback } from '@/lib/axios'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  /**
   * Refresh token en memoria (NO persistido en sessionStorage).
   * Se mantiene solo mientras la pestaña está abierta.
   * En un diseño completo, este token debería vivir en una cookie httpOnly
   * gestionada por el backend; lo mantenemos en memoria como mitigación
   * intermedia (C-03: CWE-922).
   */
  refreshToken: string | null
}

interface AuthActions {
  setUser: (user: User, accessToken: string, refreshToken?: string) => void
  setRefreshToken: (token: string | null) => void
  updateUser: (partial: Partial<User>) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    immer((set) => ({
      // ─── State ─────────────────────────────────────────────────────────────
      user: null,
      isAuthenticated: false,
      isLoading: false,
      refreshToken: null,

      // ─── Actions ───────────────────────────────────────────────────────────
      setUser: (user, accessToken, refreshToken) => {
        // El access token vive SOLO en memoria (axios.ts), nunca en sessionStorage
        setAccessToken(accessToken)
        set((state) => {
          state.user = user
          state.isAuthenticated = true
          state.isLoading = false
          if (refreshToken) {
            state.refreshToken = refreshToken
          }
        })
      },

      setRefreshToken: (token) => {
        set((state) => {
          state.refreshToken = token
        })
      },

      updateUser: (partial) => {
        set((state) => {
          if (state.user) {
            Object.assign(state.user, partial)
          }
        })
      },

      logout: () => {
        setAccessToken(null)
        set((state) => {
          state.user = null
          state.isAuthenticated = false
          state.isLoading = false
          state.refreshToken = null
        })
      },

      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading
        })
      },
    })),
    {
      name: 'mitrufely-auth',
      storage: createJSONStorage(() => sessionStorage),
      // ── C-03 (CWE-922): SOLO persistimos datos no sensibles del usuario.
      // El access_token y refresh_token NO se persisten en sessionStorage:
      //   - access_token → solo en memoria (axios.ts, variable de módulo)
      //   - refresh_token → solo en memoria (state del store, no partialized)
      // Antes ambos tokens se guardaban en sessionStorage, lo que los exponía
      // a robo por XSS. Ahora sessionStorage solo guarda user/isAuthenticated.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

// Registra el callback de logout en Axios para que el interceptor 401
// pueda llamar logout sin crear un import circular
registerLogoutCallback(() => {
  useAuthStore.getState().logout()
})

