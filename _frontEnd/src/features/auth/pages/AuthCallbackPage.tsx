import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useGoogleLogin } from '../hooks/useGoogleLogin'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import type { AxiosError } from 'axios'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { mutate: loginWithGoogle, isError, error } = useGoogleLogin()
  const hasCalled = useRef(false)

  useEffect(() => {
    // 1. Obtener parámetros de búsqueda (?key=val) y fragmento hash (#key=val)
    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))

    // Intentar extraer el token de Google (puede venir como id_token o credential)
    const idToken =
      searchParams.get('id_token') ||
      hashParams.get('id_token') ||
      searchParams.get('credential') ||
      hashParams.get('credential')

    if (idToken) {
      if (!hasCalled.current) {
        hasCalled.current = true
        loginWithGoogle(idToken)
      }
    } else {
      // Si no hay token, verificar si Google devolvió algún error
      const errorMsg = searchParams.get('error') || hashParams.get('error')
      if (errorMsg) {
        toast.error(`Error de autenticación de Google: ${errorMsg}`)
      } else {
        toast.error('No se recibió el token de autenticación de Google.')
      }
      navigate('/login', { replace: true })
    }
  }, [loginWithGoogle, navigate])

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#f0efed] px-4 overflow-hidden">
      {/* Patrón de Destellos de Fondo Decorativo (Sparkles Pattern) */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cpath d='M40 0l3 37 37 3-37 3-3 37-3-37-37-3 37-3z' fill='%235c0f1b' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md bg-[#e6e6e6]/95 backdrop-blur-md rounded-[40px] border-2 border-[#5c0f1b] p-10 md:p-12 text-center shadow-[0_20px_50px_rgba(92,15,27,0.12)]"
      >
        {isError ? (
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive border-2 border-destructive/20 animate-pulse">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <h2
                className="font-display text-2xl font-black text-[#5c0f1b]"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Error de Autenticación
              </h2>
              <p className="text-sm font-semibold text-[#2a1115]/80 mt-2">
                {(error as AxiosError<{ error?: { message?: string } }>)?.response?.data?.error?.message ||
                  'No se pudo verificar la sesión con el servidor.'}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/login', { replace: true })}
              className="mt-2 w-full bg-[#5c0f1b] text-white hover:bg-[#5c0f1b]/90 py-3 rounded-full text-base font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver a Iniciar Sesión</span>
            </motion.button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            {/* Animación premium de carga */}
            <div className="relative flex h-20 w-20 items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-4 border-[#ff7a45]/20 border-t-[#ff7a45]"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="absolute h-14 w-14 rounded-full border-4 border-[#5c0f1b]/10 border-b-[#5c0f1b]"
              />
            </div>
            <div>
              <h2
                className="font-display text-[#5c0f1b] text-3xl font-black tracking-tight"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Verificando Cuenta
              </h2>
              <p className="text-sm font-semibold text-[#2a1115]/70 mt-2 animate-pulse">
                Conectando de forma segura con Mitrufely...
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
