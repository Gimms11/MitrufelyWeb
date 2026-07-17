import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react'
import { useChangePassword, useProfileData } from '@/features/auth/hooks/useProfile'

export function SecurityPage() {
  const { data: profileData } = useProfileData()
  const { mutate: changePassword, isPending } = useChangePassword()
  
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError(null)
  }

  const validatePassword = (password: string) => {
    if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres."
    if (!/[A-Z]/.test(password)) return "La contraseña debe contener al menos una mayúscula."
    if (!/[0-9]/.test(password)) return "La contraseña debe contener al menos un número."
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.new_password !== formData.confirm_password) {
      setError("Las contraseñas nuevas no coinciden.")
      return
    }

    const validationError = validatePassword(formData.new_password)
    if (validationError) {
      setError(validationError)
      return
    }

    changePassword(
      {
        current_password: formData.current_password,
        new_password: formData.new_password,
      },
      {
        onSuccess: () => {
          setFormData({
            current_password: '',
            new_password: '',
            confirm_password: '',
          })
        },
      }
    )
  }

  // If user is logged in via Google, they cannot change their password here
  if (profileData?.auth_provider === 'google') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1
            className="font-black text-[#2a1115] text-2xl md:text-3xl"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Seguridad
          </h1>
          <p className="text-sm text-[#2a1115]/60 font-medium mt-1">
            Gestiona la contraseña de tu cuenta
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#5c0f1b]/8 p-8 text-center flex flex-col items-center justify-center max-w-2xl mx-auto mt-10">
          <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <ShieldCheck className="h-8 w-8 text-blue-500" />
          </div>
          <h2 className="font-black text-[#2a1115] text-xl mb-2">Cuenta vinculada a Google</h2>
          <p className="text-stone-500 text-sm max-w-md">
            Iniciaste sesión utilizando Google. Tu contraseña y seguridad están gestionadas directamente por tu cuenta de Google, por lo que no es necesario establecer una contraseña aquí.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1
          className="font-black text-[#2a1115] text-2xl md:text-3xl"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Seguridad
        </h1>
        <p className="text-sm text-[#2a1115]/60 font-medium mt-1">
          Actualiza la contraseña de tu cuenta
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#5c0f1b]/8 p-5 md:p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wide text-stone-500">
              Contraseña Actual <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="current_password"
              value={formData.current_password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-[#faf8f5] text-sm font-semibold text-[#2a1115] outline-none focus:border-[#5c0f1b] transition-colors"
            />
          </div>

          <hr className="border-stone-100 my-4" />
          
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wide text-stone-500">
              Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="new_password"
              value={formData.new_password}
              onChange={handleChange}
              required
              placeholder="Mínimo 8 caracteres, una mayúscula y un número"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-[#faf8f5] text-sm font-semibold text-[#2a1115] outline-none focus:border-[#5c0f1b] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wide text-stone-500">
              Confirmar Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              required
              placeholder="Repite tu nueva contraseña"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-[#faf8f5] text-sm font-semibold text-[#2a1115] outline-none focus:border-[#5c0f1b] transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#5c0f1b] hover:bg-[#7a1525] text-white text-sm font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Cambiar Contraseña
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
