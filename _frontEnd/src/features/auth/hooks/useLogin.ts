import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router'
import { toast } from 'sonner'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '@/app/store'
import type { LoginCredentials } from '@/types/auth'
import type { AxiosError } from 'axios'

export interface DecodedToken {
  sub: string
  role: string
  email?: string
  nombres?: string
  apellidos?: string
  extra?: {
    email?: string
    nombres?: string
    apellidos?: string
  }
}

export function decodeJwt(token: string): DecodedToken | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64Url = parts[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function mapRole(backendRole: string): 'admin' | 'manager' | 'baker' | 'cashier' | 'customer' {
  const role = backendRole.toUpperCase()
  if (role === 'ADMIN') return 'admin'
  if (role === 'CLIENTE') return 'customer'
  if (role === 'CAJERO') return 'cashier'
  if (role === 'ALMACEN') return 'baker'
  return 'customer'
}

export function useLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore((s) => s.setUser)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  const fromRef = useRef(from)

  useEffect(() => {
    fromRef.current = from
  }, [from])

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      const decoded = decodeJwt(data.access_token)
      if (!decoded) {
        toast.error('Token inválido recibido del servidor.')
        return
      }

      // Estructuramos el usuario extrayendo datos del JWT
      const emailVal = decoded.email || decoded.extra?.email || ''
      const nombresVal = decoded.nombres || decoded.extra?.nombres
      const apellidosVal = decoded.apellidos || decoded.extra?.apellidos
      const fallbackName = emailVal ? (emailVal.split('@')[0] || 'Usuario') : 'Usuario'

      const user = {
        id: decoded.sub,
        email: emailVal,
        name: nombresVal
          ? `${nombresVal} ${apellidosVal || ''}`.trim()
          : fallbackName,
        role: mapRole(decoded.role),
        sweetCoinsBalance: 1000, // puntos iniciales para la UI
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setUser(user, data.access_token, data.refresh_token)
      toast.success('¡Sesión iniciada correctamente!')
      navigate(fromRef.current, { replace: true })
    },
    onError: (error: unknown) => {
      const message = (error as AxiosError<{ error?: { message?: string } }>)?.response?.data?.error?.message || 'Credenciales incorrectas o error de conexión.'
      toast.error(message)
    },
  })
}
