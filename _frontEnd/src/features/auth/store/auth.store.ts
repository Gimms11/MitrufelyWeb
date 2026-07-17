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
   * Refresh token persistido en sessionStorage para sobrevivir recargas de página.
   * El access_token NO se persiste (vive solo en memoria en axios.ts).
   * En producción ideal el refresh token viviría en una cookie httpOnly del backend.
   */
  refreshToken: string | null
  /** true una vez que el proceso de rehidratación del accessToken terminó */
  isInitialized: boolean
}

interface AuthActions {
  setUser: (user: User, accessToken: string, refreshToken?: string) => void
  setRefreshToken: (token: string | null) => void
  updateUser: (partial: Partial<User>) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  setInitialized: (value: boolean) => void
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
      isInitialized: false,

      // ─── Actions ───────────────────────────────────────────────────────────
      setUser: (user, accessToken, refreshToken) => {
        // El access token vive SOLO en memoria (axios.ts), nunca en sessionStorage
        setAccessToken(accessToken)
        set((state) => {
          state.user = user
          state.isAuthenticated = true
          state.isLoading = false
          state.isInitialized = true
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
          state.isInitialized = true
        })
      },

      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading
        })
      },

      setInitialized: (value) => {
        set((state) => {
          state.isInitialized = value
        })
      },
    })),
    {
      name: 'mitrufely-auth',
      storage: createJSONStorage(() => sessionStorage),
      // ── C-03 (CWE-922): persistimos user, isAuthenticated y refreshToken.
      // El access_token NO se persiste (vive solo en memoria en axios.ts).
      // El refreshToken se persiste en sessionStorage (no accesible entre pestañas)
      // para permitir recuperar el accessToken al recargar la página sin forzar
      // un logout. En producción ideal viviría en una cookie httpOnly del backend.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)

import { useCriptoTrufaStore } from '@/stores/criptotrufa.store'

// Registra el callback de logout en Axios para que el interceptor 401
// pueda llamar logout sin crear un import circular
registerLogoutCallback(() => {
  useAuthStore.getState().logout()
  useCriptoTrufaStore.getState().reset()
})

