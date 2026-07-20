import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'

// Mockear axios para evitar errores de red y dependencias circulares
vi.mock('@/lib/axios', () => ({
  setAccessToken: vi.fn(),
  registerLogoutCallback: vi.fn(),
}))

// Mockear criptotrufa store
vi.mock('@/stores/criptotrufa.store', () => ({
  useCriptoTrufaStore: {
    getState: () => ({
      reset: vi.fn(),
    }),
  },
}))

import { useAuthStore } from '../features/auth/store/auth.store'

describe('useAuthStore', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
  })

  it('debe inicializarse con valores por defecto', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.refreshToken).toBeNull()
  })

  it('debe establecer el usuario y autenticación con setUser', () => {
    const fakeUser = {
      id: '1',
      email: 'juan@test.com',
      name: 'Juan Perez',
      role: 'CLIENTE',
      sweetCoinsBalance: 100,
      createdAt: '2026-07-20T12:00:00Z',
      updatedAt: '2026-07-20T12:00:00Z',
    } as any

    act(() => {
      useAuthStore.getState().setUser(fakeUser, 'access_token_123', 'refresh_token_456')
    })

    const state = useAuthStore.getState()
    expect(state.user).toEqual(fakeUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.refreshToken).toBe('refresh_token_456')
  })

  it('debe limpiar el estado con logout', () => {
    const fakeUser = {
      id: '1',
      email: 'juan@test.com',
      name: 'Juan Perez',
      role: 'CLIENTE',
      sweetCoinsBalance: 100,
      createdAt: '2026-07-20T12:00:00Z',
      updatedAt: '2026-07-20T12:00:00Z',
    } as any

    act(() => {
      useAuthStore.getState().setUser(fakeUser, 'access_token_123', 'refresh_token_456')
    })

    act(() => {
      useAuthStore.getState().logout()
    })

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.refreshToken).toBeNull()
  })

  it('debe actualizar parcialmente los datos del usuario con updateUser', () => {
    const fakeUser = {
      id: '1',
      email: 'juan@test.com',
      name: 'Juan Perez',
      role: 'CLIENTE',
      sweetCoinsBalance: 100,
      createdAt: '2026-07-20T12:00:00Z',
      updatedAt: '2026-07-20T12:00:00Z',
    } as any

    act(() => {
      useAuthStore.getState().setUser(fakeUser, 'access_token_123', 'refresh_token_456')
    })

    act(() => {
      useAuthStore.getState().updateUser({ name: 'Juan Carlos Perez' })
    })

    const state = useAuthStore.getState()
    expect(state.user?.name).toBe('Juan Carlos Perez')
    expect(state.user?.email).toBe('juan@test.com')
  })
})
