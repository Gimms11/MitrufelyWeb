import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useVerifyAccount } from '../hooks/useVerifyAccount'
import { Loader2, CheckCircle2, XCircle, Sparkles, ArrowRight } from 'lucide-react'

export default function VerifyPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  // hasCalled evita dobles llamadas en React Strict Mode (doble invocación de effects)
  const hasCalled = useRef(false)
  // isIdle: true antes de que comience la llamada al servidor (primer segundo de espera)
  const [isIdle, setIsIdle] = useState(true)

  const { mutate: verifyAccount, isPending, isSuccess, isError, error } = useVerifyAccount()

  useEffect(() => {
    if (token) {
      // Retardar 1s para mostrar la pantalla de carga premium; retornar cleanup para evitar memory leak
      const timerId = setTimeout(() => {
        if (!hasCalled.current) {
          hasCalled.current = true
          setIsIdle(false)
          verifyAccount(token)
        }
      }, 1000)
      return () => clearTimeout(timerId)
    }
  }, [token, verifyAccount])

  // Obtener el mensaje de error de la API si existe
  const apiErrorMessage = (error as any)?.response?.data?.error?.message || 'El enlace de verificación es inválido o ha expirado.'

  // Animaciones Framer Motion con tipado estricto
  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } 
    },
    exit: { 
      opacity: 0, 
      y: -20, 
      scale: 0.95,
      transition: { duration: 0.3, ease: 'easeIn' as const }
    }
  }

  const sparkleVariants = {
    initial: { scale: 1, opacity: 0.3, rotate: 0 },
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.5, 1, 0.5],
      rotate: [0, 180, 360],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut' as const
      }
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#f0efed] px-4 py-12 overflow-hidden">
      {/* Patrón de Destellos de Fondo Decorativo (Sparkles Pattern) */}
      <div 
        className="absolute inset-0 opacity-[0.08] pointer-events-none" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cpath d='M40 0l3 37 37 3-37 3-3 37-3-37-37-3 37-3z' fill='%235c0f1b' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px',
        }}
      />

      <AnimatePresence mode="wait">
        {/* CASO: No hay token */}
        {!token && (
          <motion.div
            key="no-token"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-md bg-[#e6e6e6]/90 backdrop-blur-md rounded-[40px] border-2 border-[#5c0f1b] p-10 md:p-12 shadow-[0_20px_50px_rgba(92,15,27,0.15)] text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-destructive/10 rounded-full border border-destructive/20 text-destructive">
                <XCircle className="h-12 w-12" />
              </div>
            </div>
            <h2 
              className="text-[#5c0f1b] text-3xl font-black tracking-tight mb-4"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Falta el Token
            </h2>
            <p className="text-sm font-semibold text-[#2a1115]/80 mb-8 leading-relaxed">
              No se ha proporcionado un token de verificación de cuenta. Por favor, asegúrate de hacer clic en el enlace exacto enviado a tu correo.
            </p>
            <Link 
              to="/register" 
              className="inline-flex w-full bg-[#ff7a45] text-white hover:bg-[#ff7a45]/90 py-3.5 rounded-full text-lg font-black tracking-wide shadow-md transition-all justify-center items-center gap-2"
            >
              Crear una cuenta
            </Link>
          </motion.div>
        )}

        {/* CASO: Verificando (Cargando) — Cubre estado idle (antes del timeout) y pending (llamada en vuelo) */}
        {token && (isIdle || isPending) && (
          <motion.div
            key="verifying"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-md bg-[#e6e6e6]/90 backdrop-blur-md rounded-[40px] border-2 border-[#5c0f1b] p-10 md:p-12 shadow-[0_20px_50px_rgba(92,15,27,0.15)] text-center"
          >
            <div className="relative flex justify-center mb-8">
              {/* Círculo giratorio pastel con estilo de pastelería */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                className="h-20 w-20 rounded-full border-4 border-[#5c0f1b]/10 border-t-[#ff7a45] flex items-center justify-center"
              />
              <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-[#5c0f1b] animate-spin" />
            </div>
            
            <h2 
              className="text-[#5c0f1b] text-3xl font-black tracking-tight mb-4"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Verificando Cuenta
            </h2>
            <p className="text-base font-semibold text-[#2a1115]/80 leading-relaxed">
              Preparando tu vitrina de SweetCoins...
            </p>
            <p className="text-xs font-medium text-[#5c0f1b]/60 mt-2">
              Confirmando tu registro artesanal en Mitrufely Web
            </p>
          </motion.div>
        )}

        {/* CASO: Éxito en verificación */}
        {token && isSuccess && (
          <motion.div
            key="success"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-md bg-[#e6e6e6]/90 backdrop-blur-md rounded-[40px] border-2 border-[#5c0f1b] p-10 md:p-12 shadow-[0_20px_50px_rgba(92,15,27,0.15)] text-center"
          >
            {/* Animación de destellos flotantes */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[40px]">
              <motion.div variants={sparkleVariants} initial="initial" animate="animate" className="absolute top-10 left-12 text-[#ff7a45]/40"><Sparkles className="h-5 w-5" /></motion.div>
              <motion.div variants={sparkleVariants} initial="initial" animate="animate" className="absolute bottom-16 right-12 text-[#ff7a45]/40"><Sparkles className="h-6 w-6" /></motion.div>
            </div>

            <div className="flex justify-center mb-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.6, times: [0, 0.7, 1] }}
                className="p-4 bg-emerald-500/10 rounded-full border-2 border-emerald-500 text-emerald-600 shadow-[0_4px_20px_rgba(16,185,129,0.15)]"
              >
                <CheckCircle2 className="h-14 w-14" />
              </motion.div>
            </div>

            <h2 
              className="text-[#5c0f1b] text-3xl font-black tracking-tight mb-4"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              ¡Cuenta Verificada!
            </h2>
            <p className="text-sm font-semibold text-[#2a1115]/80 mb-3 leading-relaxed">
              Tu cuenta ha sido activada con total éxito. Ya formas parte de nuestra comunidad de amantes de la repostería artesanal.
            </p>
            <p className="text-xs font-bold text-[#ff7a45] mb-8 bg-[#ff7a45]/10 py-2 px-4 rounded-full inline-block">
              🎁 ¡Tus primeros 1000 SweetCoins te esperan!
            </p>

            <Link 
              to="/login" 
              className="inline-flex w-full bg-[#ff7a45] text-white hover:bg-[#ff7a45]/90 py-3.5 rounded-full text-lg font-black tracking-wide shadow-md transition-all justify-center items-center gap-2 group"
            >
              <span>Iniciar Sesión</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        )}

        {/* CASO: Error en verificación */}
        {token && isError && (
          <motion.div
            key="error"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-md bg-[#e6e6e6]/90 backdrop-blur-md rounded-[40px] border-2 border-[#5c0f1b] p-10 md:p-12 shadow-[0_20px_50px_rgba(92,15,27,0.15)] text-center"
          >
            <div className="flex justify-center mb-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.6 }}
                className="p-4 bg-rose-500/10 rounded-full border-2 border-rose-500 text-rose-600"
              >
                <XCircle className="h-14 w-14" />
              </motion.div>
            </div>

            <h2 
              className="text-[#5c0f1b] text-3xl font-black tracking-tight mb-4"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Verificación Fallida
            </h2>
            <p className="text-sm font-semibold text-[#2a1115]/80 mb-8 leading-relaxed">
              {apiErrorMessage}
            </p>

            <div className="space-y-3">
              <Link 
                to="/register" 
                className="inline-flex w-full bg-[#ff7a45] text-white hover:bg-[#ff7a45]/90 py-3.5 rounded-full text-lg font-black tracking-wide shadow-md transition-all justify-center items-center gap-2"
              >
                Registrarme de nuevo
              </Link>
              <Link 
                to="/login" 
                className="inline-flex w-full bg-[#5c0f1b] text-white hover:bg-[#5c0f1b]/95 py-3.5 rounded-full text-lg font-black tracking-wide shadow-md transition-all justify-center items-center gap-2"
              >
                Ir al Inicio
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
