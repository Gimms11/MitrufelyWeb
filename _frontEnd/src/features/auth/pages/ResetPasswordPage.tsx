import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useSearchParams, Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useResetPassword } from '../hooks/useResetPassword'
import { Lock, AlertCircle, Loader2, CheckCircle2, XCircle, Sparkles, ArrowRight } from 'lucide-react'
import type { AxiosError } from 'axios'

// Schema de validación: nueva contraseña + confirmación con refine de igualdad
const resetPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .refine((v) => /[A-Z]/.test(v), 'Debe contener al menos una mayúscula')
      .refine((v) => /\d/.test(v), 'Debe contener al menos un número'),
    confirm_password: z.string().min(1, 'Debes confirmar tu contraseña.'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirm_password'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const { mutate: resetPassword, isPending, isSuccess, isError, error } = useResetPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = (data: ResetPasswordFormValues) => {
    if (token) {
      resetPassword({ token, new_password: data.new_password })
    }
  }

  // Mensaje de error de la API (token inválido/expirado/ya usado)
  const apiErrorMessage =
    (error as AxiosError<{ error?: { message?: string } }>)?.response?.data?.error?.message ||
    'El enlace de recuperación es inválido, ha expirado o ya fue utilizado.'

  // Variantes de animación (mismas que VerifyPage)
  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: { duration: 0.3, ease: 'easeIn' as const },
    },
  }

  const sparkleVariants = {
    initial: { scale: 1, opacity: 0.3, rotate: 0 },
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.5, 1, 0.5],
      rotate: [0, 180, 360],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
    },
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
              No se ha proporcionado un token de recuperación. Por favor, asegúrate de hacer clic en el enlace exacto enviado a tu correo.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex w-full bg-[#ff7a45] text-white hover:bg-[#ff7a45]/90 py-3.5 rounded-full text-lg font-black tracking-wide shadow-md transition-all justify-center items-center gap-2"
            >
              Solicitar un Enlace
            </Link>
          </motion.div>
        )}

        {/* CASO: Formulario (token presente, sin éxito ni error) */}
        {token && !isSuccess && !isError && (
          <motion.div
            key="form"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-lg bg-[#e6e6e6]/90 backdrop-blur-md rounded-[40px] border-[#5c0f1b] p-10 md:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.25)]"
          >
            <div className="text-center mb-8">
              <motion.h1
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="font-display text-[#5c0f1b] text-4xl font-black tracking-tight select-none"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Nueva Contraseña
              </motion.h1>
              <p className="text-sm font-semibold text-[#5c0f1b]/80 mt-2">
                Elige una contraseña segura para tu cuenta
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Campo: Nueva Contraseña */}
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#5c0f1b]">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  placeholder="Nueva Contraseña"
                  {...register('new_password')}
                  className={`w-full bg-[#f0efed]/90 text-[#5c0f1b] placeholder-[#5c0f1b]/40 rounded-full border-2 pl-12 pr-4 py-3.5 text-base font-medium transition-all outline-none focus-visible:!outline-none ${
                    errors.new_password
                      ? 'border-destructive focus:border-destructive focus:border-4 focus:ring-0'
                      : 'border-[#5c0f1b] focus:border-[#5c0f1b] focus:border-4 focus:ring-0'
                  }`}
                />
                {errors.new_password && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-destructive mt-1.5 pl-3"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.new_password.message}
                  </motion.p>
                )}
              </div>

              {/* Campo: Confirmar Contraseña */}
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#5c0f1b]">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  placeholder="Confirmar Contraseña"
                  {...register('confirm_password')}
                  className={`w-full bg-[#f0efed]/90 text-[#5c0f1b] placeholder-[#5c0f1b]/40 rounded-full border-2 pl-12 pr-4 py-3.5 text-base font-medium transition-all outline-none focus-visible:!outline-none ${
                    errors.confirm_password
                      ? 'border-destructive focus:border-destructive focus:border-4 focus:ring-0'
                      : 'border-[#5c0f1b] focus:border-[#5c0f1b] focus:border-4 focus:ring-0'
                  }`}
                />
                {errors.confirm_password && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-destructive mt-1.5 pl-3"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.confirm_password.message}
                  </motion.p>
                )}
              </div>

              {/* Botón de acción */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isPending}
                className="w-full bg-[#ff7a45] text-white hover:bg-[#ff7a45]/90 py-3.5 rounded-full text-lg font-black tracking-wide shadow-md transition-all disabled:opacity-75 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Restableciendo...</span>
                  </>
                ) : (
                  <span>Restablecer Contraseña</span>
                )}
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* CASO: Cargando (pendiente y sin formulario visible — edge case defensivo) */}
        {token && isPending && isSuccess === false && isError === false && false && (
          <motion.div
            key="loading"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-md bg-[#e6e6e6]/90 backdrop-blur-md rounded-[40px] border-2 border-[#5c0f1b] p-10 md:p-12 shadow-[0_20px_50px_rgba(92,15,27,0.15)] text-center"
          >
            <div className="flex justify-center mb-8">
              <Loader2 className="h-12 w-12 text-[#5c0f1b] animate-spin" />
            </div>
            <p className="text-base font-semibold text-[#2a1115]/80">Procesando...</p>
          </motion.div>
        )}

        {/* CASO: Éxito */}
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
              <motion.div
                variants={sparkleVariants}
                initial="initial"
                animate="animate"
                className="absolute top-10 left-12 text-[#ff7a45]/40"
              >
                <Sparkles className="h-5 w-5" />
              </motion.div>
              <motion.div
                variants={sparkleVariants}
                initial="initial"
                animate="animate"
                className="absolute bottom-16 right-12 text-[#ff7a45]/40"
              >
                <Sparkles className="h-6 w-6" />
              </motion.div>
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
              ¡Contraseña Restablecida!
            </h2>
            <p className="text-sm font-semibold text-[#2a1115]/80 mb-8 leading-relaxed">
              Tu contraseña se ha actualizado con éxito. Ya puedes iniciar sesión con tu nueva contraseña.
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

        {/* CASO: Error */}
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
              Restablecimiento Fallido
            </h2>
            <p className="text-sm font-semibold text-[#2a1115]/80 mb-8 leading-relaxed">
              {apiErrorMessage}
            </p>

            <div className="space-y-3">
              <Link
                to="/forgot-password"
                className="inline-flex w-full bg-[#ff7a45] text-white hover:bg-[#ff7a45]/90 py-3.5 rounded-full text-lg font-black tracking-wide shadow-md transition-all justify-center items-center gap-2"
              >
                Solicitar un Nuevo Enlace
              </Link>
              <Link
                to="/login"
                className="inline-flex w-full bg-[#5c0f1b] text-white hover:bg-[#5c0f1b]/95 py-3.5 rounded-full text-lg font-black tracking-wide shadow-md transition-all justify-center items-center gap-2"
              >
                Ir al Inicio de Sesión
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
