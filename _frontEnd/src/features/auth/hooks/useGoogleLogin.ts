import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router'
import { toast } from 'sonner'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '@/app/store'
import { decodeJwt, mapRole } from './useLogin'
import type { AxiosError } from 'axios'

export function useGoogleLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore((s) => s.setUser)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  const fromRef = useRef(from)

  useEffect(() => {
    fromRef.current = from
  }, [from])

  return useMutation({
    mutationFn: (idToken: string) => authApi.loginWithGoogle(idToken),
    onSuccess: (data) => {
      const decoded = decodeJwt(data.access_token)
      if (!decoded) {
        toast.error('Token de Google procesado, pero la firma local es inválida.')
        return
      }

      // Estructuramos el usuario extrayendo datos del JWT devuelto por nuestro backend
      const emailVal = decoded.email || decoded.extra?.email || ''
      const nombresVal = decoded.nombres || decoded.extra?.nombres
      const apellidosVal = decoded.apellidos || decoded.extra?.apellidos
      const fallbackName = emailVal ? (emailVal.split('@')[0] || 'Usuario Google') : 'Usuario Google'

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
      toast.success('¡Sesión iniciada con Google correctamente!')
      navigate(fromRef.current, { replace: true })
    },
    onError: (error: unknown) => {
      const message = (error as AxiosError<{ error?: { message?: string } }>)?.response?.data?.error?.message || 'Error al iniciar sesión con Google.'
      toast.error(message)
    },
  })
}
