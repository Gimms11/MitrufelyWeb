/**
 * PaymentModal.tsx — Modal de checkout con react-hook-form + Zod.
 *
 * Fases:
 *   1. Formulario (datos personales, envío, método de pago)
 *   2. Loading simulado (1.5 s)
 *   3. Éxito: confetti + mensaje + limpieza del carrito
 *
 * El modal usa el mismo patrón de overlay/spring que ProductModal.tsx.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Loader2, CreditCard, Smartphone, Banknote } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useNavigate } from 'react-router'

import { checkoutSchema, type CheckoutFormData } from '../schemas/checkout.schema'
import {
  useCartStore,
  selectSubtotal,
  selectTotal,
} from '@/stores/cart.store'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

type Phase = 'form' | 'loading' | 'success'

const METODOS = [
  { value: 'tarjeta',    label: 'Pago con tarjeta',       icon: CreditCard },
  { value: 'billetera',  label: 'Billetera Digital',       icon: Smartphone },
  { value: 'efectivo',   label: 'Efectivo – Contra entrega', icon: Banknote },
] as const

// Campo reutilizable
function Field({
  label,
  error,
  required = false,
  children,
}: {
  label: string
  error?: string | undefined
  required?: boolean | undefined
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-black text-[#2a1115]/70 uppercase tracking-wide">
        {label}
        {required && <span className="text-[#5c0f1b] ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[10px] font-bold text-red-500">{error}</p>
      )}
    </div>
  )
}

// Input estándar
function Input({
  id,
  placeholder,
  error,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string
  placeholder?: string
  error?: boolean
}) {
  return (
    <input
      id={id}
      placeholder={placeholder}
      {...rest}
      className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold text-[#2a1115] placeholder:text-[#2a1115]/30 focus:outline-none focus:ring-2 focus:ring-[#ff7a45]/40 transition-all ${
        error
          ? 'border-red-400 bg-red-50'
          : 'border-[#5c0f1b]/20 bg-white hover:border-[#5c0f1b]/40'
      }`}
    />
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function PaymentModal({ isOpen, onClose }: PaymentModalProps) {
  const navigate   = useNavigate()
  const [phase, setPhase] = useState<Phase>('form')
  const clearCart  = useCartStore((s) => s.clearCart)
  const cartState  = useCartStore()
  const subtotal   = selectSubtotal(cartState)
  const total      = selectTotal(cartState)
  const discount   = cartState.discount
  const canvasRef  = useRef<HTMLCanvasElement | null>(null)
  const confettiRef = useRef<confetti.CreateTypes | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { metodoPago: 'tarjeta', tipoDocumento: 'DNI' },
  })

  const tipoDoc  = watch('tipoDocumento')
  const metodoPago = watch('metodoPago')

  // Resetear form al abrir
  useEffect(() => {
    if (isOpen) {
      reset()
      setPhase('form')
    }
  }, [isOpen, reset])

  // Bloquear scroll + Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'loading') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, phase, onClose])

  // ── Confetti ──────────────────────────────────────────────────────────────
  // Inicializar confetti sobre el canvas del portal cuando esté disponible
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Ajustar el canvas al tamaño real de la pantalla
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    confettiRef.current = confetti.create(canvas, {
      resize: true,
      useWorker: false,
    })
    return () => {
      confettiRef.current?.reset()
    }
  }, [isOpen])

  const fireConfetti = () => {
    const shoot = confettiRef.current ?? confetti
    const fire = (particleRatio: number, opts: confetti.Options) => {
      shoot({
        origin: { y: 0.6 },
        ...opts,
        particleCount: Math.floor(200 * particleRatio),
      })
    }
    fire(0.25, { spread: 26, startVelocity: 55, colors: ['#5c0f1b', '#ff7a45', '#fff'] })
    fire(0.2,  { spread: 60, colors: ['#ff7a45', '#5c0f1b'] })
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#fff', '#5c0f1b'] })
    fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
    fire(0.1,  { spread: 120, startVelocity: 45, colors: ['#ff7a45'] })
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (_data: CheckoutFormData) => {
    setPhase('loading')
    await new Promise((res) => setTimeout(res, 1600))
    clearCart()
    setPhase('success')
    setTimeout(() => fireConfetti(), 100)
  }

  // ── Cerrar (success) ──────────────────────────────────────────────────────
  const handleSuccessClose = () => {
    onClose()
    navigate('/catalogo')
  }

  return (
    <>
    {/* ── Canvas global del confetti — portal sobre document.body ── */}
    {typeof document !== 'undefined' && createPortal(
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 99999,
        }}
      />,
      document.body,
    )}
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => phase !== 'loading' && onClose()}
        >
          <motion.div
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="bg-white w-full max-w-lg rounded-[28px] overflow-hidden shadow-2xl relative border border-[#5c0f1b]/10 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Modal de pago"
          >


            {/* ── Header del modal ── */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#5c0f1b]/8 shrink-0">
              <h2
                className="font-black text-[#2a1115] text-lg"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {phase === 'success' ? '¡Pago completado!' : 'Finalizar compra'}
              </h2>
              {phase !== 'loading' && (
                <button
                  id="payment-modal-close"
                  onClick={onClose}
                  aria-label="Cerrar modal de pago"
                  className="p-2 rounded-full border border-[#5c0f1b]/10 text-[#5c0f1b] hover:text-[#ff7a45] hover:scale-110 active:scale-90 transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                FASE: LOADING
            ══════════════════════════════════════════════════════════════ */}
            {phase === 'loading' && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-4 border-[#5c0f1b]/10" />
                  <Loader2 className="h-20 w-20 text-[#5c0f1b] animate-spin absolute inset-0" />
                </div>
                <div className="text-center">
                  <p
                    className="font-black text-[#2a1115] text-lg"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Procesando tu pago…
                  </p>
                  <p className="text-sm text-[#2a1115]/50 font-medium mt-1">
                    Por favor no cierres esta ventana
                  </p>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                FASE: SUCCESS
            ══════════════════════════════════════════════════════════════ */}
            {phase === 'success' && (
              <div className="flex-1 flex flex-col items-center justify-center py-14 gap-6 px-8 text-center">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
                >
                  <CheckCircle className="h-24 w-24 text-emerald-500" strokeWidth={1.5} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3
                    className="font-black text-[#2a1115] text-2xl mb-2"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    ¡Compra exitosa! 🎉
                  </h3>
                  <p className="text-sm text-[#2a1115]/60 font-medium max-w-xs mx-auto">
                    Tu pedido ha sido registrado. Te enviaremos la confirmación
                    en breve. ¡Gracias por confiar en Mitrufely!
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="flex gap-3 mt-2 w-full"
                >
                  <button
                    id="payment-success-home"
                    onClick={() => { onClose(); navigate('/') }}
                    className="flex-1 py-3 rounded-full border-2 border-[#5c0f1b]/20 text-[#5c0f1b] font-black text-sm hover:border-[#5c0f1b]/40 transition-all cursor-pointer"
                  >
                    Ir al inicio
                  </button>
                  <button
                    id="payment-success-catalog"
                    onClick={handleSuccessClose}
                    className="flex-1 py-3 rounded-full bg-[#5c0f1b] text-white font-black text-sm hover:bg-[#7a1525] transition-all active:scale-95 cursor-pointer border-none"
                  >
                    Ver catálogo
                  </button>
                </motion.div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                FASE: FORM
            ══════════════════════════════════════════════════════════════ */}
            {phase === 'form' && (
              <form
                id="payment-form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="overflow-y-auto flex-1 px-6 py-5 space-y-6"
              >
                {/* ── Datos personales ── */}
                <section>
                  <h3
                    className="font-black text-[#2a1115] text-sm mb-4 uppercase tracking-widest"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Datos Personales
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nombres" error={errors.nombres?.message} required>
                      <Input
                        id="pay-nombres"
                        placeholder="Nombres completos"
                        error={!!errors.nombres}
                        {...register('nombres')}
                      />
                    </Field>
                    <Field label="Apellidos" error={errors.apellidos?.message} required>
                      <Input
                        id="pay-apellidos"
                        placeholder="Apellidos completos"
                        error={!!errors.apellidos}
                        {...register('apellidos')}
                      />
                    </Field>
                    <Field label="Teléfono" error={errors.telefono?.message} required>
                      <Input
                        id="pay-telefono"
                        type="tel"
                        placeholder="Teléfono"
                        error={!!errors.telefono}
                        {...register('telefono')}
                      />
                    </Field>
                    <Field label="Correo" error={errors.correo?.message} required>
                      <Input
                        id="pay-correo"
                        type="email"
                        placeholder="Correo Electrónico"
                        error={!!errors.correo}
                        {...register('correo')}
                      />
                    </Field>

                    {/* Tipo de documento */}
                    <Field label="Tipo de Documento" error={errors.tipoDocumento?.message} required>
                      <select
                        id="pay-tipo-doc"
                        {...register('tipoDocumento')}
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold text-[#2a1115] focus:outline-none focus:ring-2 focus:ring-[#ff7a45]/40 transition-all cursor-pointer ${
                          errors.tipoDocumento
                            ? 'border-red-400 bg-red-50'
                            : 'border-[#5c0f1b]/20 bg-white hover:border-[#5c0f1b]/40'
                        }`}
                      >
                        <option value="DNI">DNI</option>
                        <option value="RUC">RUC</option>
                      </select>
                    </Field>

                    <Field label="Número de Documento" error={errors.numeroDocumento?.message} required>
                      <Input
                        id="pay-num-doc"
                        placeholder={tipoDoc === 'RUC' ? '11 dígitos' : '8 dígitos'}
                        maxLength={tipoDoc === 'RUC' ? 11 : 8}
                        error={!!errors.numeroDocumento}
                        {...register('numeroDocumento')}
                      />
                    </Field>

                    {tipoDoc === 'RUC' && (
                      <Field
                        label="Razón Social"
                        error={errors.razonSocial?.message}
                        required
                      >
                        <div className="col-span-2">
                          <Input
                            id="pay-razon-social"
                            placeholder="Razón Social"
                            error={!!errors.razonSocial}
                            className="col-span-2"
                            {...register('razonSocial')}
                          />
                        </div>
                      </Field>
                    )}
                  </div>
                </section>

                {/* ── Envío ── */}
                <section>
                  <h3
                    className="font-black text-[#2a1115] text-sm mb-4 uppercase tracking-widest"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Envío
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Dirección" error={errors.direccion?.message} required>
                      <Input
                        id="pay-direccion"
                        placeholder="Dirección"
                        error={!!errors.direccion}
                        {...register('direccion')}
                      />
                    </Field>
                    <Field label="Referencia" error={errors.referencia?.message} required>
                      <Input
                        id="pay-referencia"
                        placeholder="Referencia"
                        error={!!errors.referencia}
                        {...register('referencia')}
                      />
                    </Field>
                  </div>
                </section>

                {/* ── Método de pago ── */}
                <section>
                  <h3
                    className="font-black text-[#2a1115] text-sm mb-4 uppercase tracking-widest"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Información de Pago
                  </h3>
                  <div className="space-y-2">
                    {METODOS.map(({ value, label, icon: Icon }) => {
                      const checked = metodoPago === value
                      return (
                        <label
                          key={value}
                          htmlFor={`pay-metodo-${value}`}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                            checked
                              ? 'bg-[#5c0f1b] border-[#5c0f1b] text-white'
                              : 'bg-white border-[#5c0f1b]/20 text-[#2a1115] hover:border-[#5c0f1b]/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`h-4 w-4 ${checked ? 'text-white' : 'text-[#5c0f1b]'}`} />
                            <span className="text-sm font-bold">{label}</span>
                          </div>
                          <div
                            className={`h-5 w-5 rounded-sm border-2 flex items-center justify-center transition-all ${
                              checked ? 'bg-white/25 border-white/60' : 'border-[#5c0f1b]/30'
                            }`}
                          >
                            {checked && (
                              <div className="h-2.5 w-2.5 rounded-sm bg-white" />
                            )}
                          </div>
                          <input
                            id={`pay-metodo-${value}`}
                            type="radio"
                            value={value}
                            className="sr-only"
                            {...register('metodoPago')}
                          />
                        </label>
                      )
                    })}
                  </div>
                </section>

                {/* ── Resumen de pago ── */}
                <section className="bg-[#faf8f5] rounded-2xl p-4 border border-[#5c0f1b]/8">
                  <div className="flex justify-between text-sm font-semibold text-[#2a1115]/70 mb-1">
                    <span>Subtotal</span>
                    <span>S/ {subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm font-semibold text-[#ff7a45] mb-1">
                      <span>Descuento</span>
                      <span>− S/ {discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-[#5c0f1b] border-t border-[#5c0f1b]/10 pt-2 mt-2">
                    <span>Total</span>
                    <span>S/ {total.toFixed(2)}</span>
                  </div>
                </section>

                {/* ── CTA ── */}
                <button
                  id="payment-submit-btn"
                  type="submit"
                  className="w-full py-4 rounded-full bg-[#5c0f1b] text-white font-black text-base hover:bg-[#7a1525] transition-all active:scale-95 shadow-lg cursor-pointer border-none"
                >
                  Pagar S/ {total.toFixed(2)}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
