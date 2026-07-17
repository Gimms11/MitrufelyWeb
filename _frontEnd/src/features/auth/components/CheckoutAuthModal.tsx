import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router'
import { X, ShoppingBag } from 'lucide-react'

interface CheckoutAuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CheckoutAuthModal({ isOpen, onClose }: CheckoutAuthModalProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Fondo negro semitransparente con desenfoque de fondo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/65 backdrop-blur-xs cursor-pointer"
            onClick={onClose}
          />

          {/* Caja del Modal */}
          <motion.div
            initial={{ scale: 0.93, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.93, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative bg-white w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl p-6 md:p-8 flex flex-col items-center text-center border border-stone-200/50 z-10"
          >
            {/* Botón de cerrar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer border-none bg-transparent"
              aria-label="Cerrar modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icono de bolsa de compra */}
            <div className="h-16 w-16 rounded-full bg-[#5c0f1b]/5 flex items-center justify-center mb-6 text-[#5c0f1b]">
              <ShoppingBag className="h-8 w-8" />
            </div>

            {/* Título */}
            <h3
              className="font-black text-[#2a1115] text-xl mb-3"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Finalizar Compra
            </h3>

            {/* Mensaje */}
            <p className="text-sm text-stone-500 font-medium leading-relaxed mb-8 max-w-xs">
              Debes iniciar sesión o registrarte para finalizar tu compra.
            </p>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => {
                  onClose()
                  navigate('/login')
                }}
                className="flex-1 bg-[#5c0f1b] hover:bg-[#7a1525] text-white font-black py-3 px-6 rounded-full text-sm shadow-md transition-all active:scale-95 cursor-pointer border-none"
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => {
                  onClose()
                  navigate('/register')
                }}
                className="flex-1 bg-stone-100 hover:bg-stone-200 text-[#2a1115]/75 font-black py-3 px-6 rounded-full text-sm transition-all active:scale-95 cursor-pointer border-none"
              >
                Registrarme
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
