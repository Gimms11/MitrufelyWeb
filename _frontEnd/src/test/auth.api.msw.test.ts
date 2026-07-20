/**
 * Tests de integración de red para authApi usando MSW
 *
 * Estas pruebas validan que las funciones de authApi funcionen correctamente
 * contra interceptaciones de red reales (no mocks de función), resolviendo RF-01.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { authApi } from '../features/auth/api/auth.api'
import { setAccessToken } from '../lib/axios'

describe('authApi (MSW — interceptación de red)', () => {
  beforeEach(() => {
    // Limpiar el token de acceso antes de cada test
    setAccessToken(null)
  })

  it('login exitoso devuelve access_token y refresh_token', async () => {
    const result = await authApi.login({
      email: 'test@mitrufely.com',
      password: 'password123',
    })

    expect(result.access_token).toBeDefined()
    expect(result.refresh_token).toBe('refresh_token_msw_test')
    expect(result.token_type).toBe('bearer')
    expect(result.expires_in).toBe(3600)
  })

  it('login con credenciales inválidas lanza error 401', async () => {
    await expect(
      authApi.login({
        email: 'invalid@test.com',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow()
  })

  it('getMe devuelve datos del usuario autenticado', async () => {
    // Simular que el usuario tiene un token válido
    setAccessToken('fake_valid_token')

    const result = await authApi.getMe()

    expect(result.id_usuario).toBe(1)
    expect(result.nombres).toBe('Juan')
    expect(result.apellidos).toBe('Perez')
    expect(result.email).toBe('test@mitrufely.com')
    expect(result.rol.nombre).toBe('CLIENTE')
  })

  it('getMe sin token lanza error 401', async () => {
    // Sin token de acceso
    setAccessToken(null)

    // Forzar que el interceptor de refresh también falle
    server.use(
      http.post('http://localhost:8000/api/v1/auth/refresh', () => {
        return HttpResponse.json({ detail: 'Invalid refresh token' }, { status: 401 })
      }),
    )

    await expect(authApi.getMe()).rejects.toThrow()
  })

  it('logout completa sin errores', async () => {
    setAccessToken('fake_valid_token')

    // authApi.logout() no devuelve datos, solo debe completar sin lanzar
    await expect(authApi.logout()).resolves.toBeUndefined()
  })
})
