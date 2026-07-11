import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Link } from 'react-router'
import { useForgotPassword } from '../hooks/useForgotPassword'
import { Mail, AlertCircle, ArrowLeft, MailCheck } from 'lucide-react'
import { motion } from 'framer-motion'

// Schema de validación Zod
const forgotPasswordSchema = z.object({
  email: z.string().email('Por favor, ingresa un correo electrónico válido.'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const { mutate: requestReset, isPending, isSuccess } = useForgotPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = (data: ForgotPasswordFormValues) => {
    requestReset(data.email)
  }

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-[#f0efed] px-4 overflow-hidden">
      {/* Patrón de Destellos de Fondo Decorativo (Sparkles Pattern) */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cpath d='M40 0l3 37 37 3-37 3-3 37-3-37-37-3 37-3z' fill='%235c0f1b' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg bg-[#e6e6e6]/90 backdrop-blur-md rounded-[40px] border-[#5c0f1b] p-10 md:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.25)]"
      >
        {/* Logotipo Tipográfico estilizado */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="font-display text-[#5c0f1b] text-5xl font-black tracking-tight drop-shadow-sm select-none"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Mitrufely
          </motion.h1>
          <p className="text-sm font-semibold text-[#5c0f1b]/80 mt-2 font-sans tracking-wide">
            Recuperar Contraseña
          </p>
        </div>

        {/* CASO: Confirmación tras enviar el formulario */}
        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-4"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-[#ff7a45]/10 rounded-full border-2 border-[#ff7a45] text-[#ff7a45]">
                <MailCheck className="h-14 w-14" />
              </div>
            </div>
            <h2
              className="text-[#5c0f1b] text-2xl font-black tracking-tight mb-4"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Revisa tu correo
            </h2>
            <p className="text-sm font-semibold text-[#2a1115]/80 mb-2 leading-relaxed">
              Si el correo está registrado, recibirás un enlace de recuperación en breve.
            </p>
            <p className="text-xs font-medium text-[#5c0f1b]/60 mb-8">
              Recuerda revisar también tu carpeta de spam o correo no deseado. El enlace expira en 15 minutos.
            </p>
            <Link
              to="/login"
              className="inline-flex w-full bg-[#ff7a45] text-white hover:bg-[#ff7a45]/90 py-3.5 rounded-full text-lg font-black tracking-wide shadow-md transition-all justify-center items-center gap-2"
            >
              Volver a Iniciar Sesión
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Descripción del flujo */}
            <p className="text-sm font-semibold text-[#2a1115]/70 mb-6 text-center leading-relaxed">
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {/* Formulario */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Campo: Correo Electrónico */}
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#5c0f1b]">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  placeholder="Correo Electrónico"
                  {...register('email')}
                  className={`w-full bg-[#f0efed]/90 text-[#5c0f1b] placeholder-[#5c0f1b]/40 rounded-full border-2 pl-12 pr-4 py-3.5 text-base font-medium transition-all outline-none focus-visible:!outline-none ${
                    errors.email
                      ? 'border-destructive focus:border-destructive focus:border-4 focus:ring-0'
                      : 'border-[#5c0f1b] focus:border-[#5c0f1b] focus:border-4 focus:ring-0'
                  }`}
                />
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-destructive mt-1.5 pl-3"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.email.message}
                  </motion.p>
                )}
              </div>

              {/* Botón de acción principal */}
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
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Enviar Enlace</span>
                )}
              </motion.button>
            </form>

            {/* Footer del card */}
            <div className="text-center mt-8 pt-4 border-t border-[#5c0f1b]/10">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5c0f1b] hover:text-[#ff7a45] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a Iniciar Sesión
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
