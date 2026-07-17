import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send } from 'lucide-react'
import { toast } from 'sonner'

interface CustomizationModalProps {
  isOpen: boolean
  onClose: () => void
}

const WHATSAPP_NUMBER = '51906491859'

export function CustomizationModal({ isOpen, onClose }: CustomizationModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    motivo: '',
    fecha: '',
    cantidad: '',
    detalles: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validación básica
    if (
      !formData.nombre.trim() ||
      !formData.motivo.trim() ||
      !formData.fecha.trim() ||
      !formData.cantidad.trim() ||
      !formData.detalles.trim()
    ) {
      toast.error('Por favor, completa todos los campos obligatorios.')
      return
    }

    const message = `🍫 Solicitud de personalización de trufas

👤 Nombre: ${formData.nombre.trim()}
🎉 Motivo: ${formData.motivo.trim()}
📅 Fecha del evento: ${formData.fecha.trim()}
🍬 Cantidad aproximada: ${formData.cantidad.trim()}
📝 Detalles:
${formData.detalles.trim()}`

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer')
    
    // Opcionalmente podemos limpiar el formulario
    setFormData({ nombre: '', motivo: '', fecha: '', cantidad: '', detalles: '' })
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop con blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Contenedor del Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg bg-[#faf8f5] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#5c0f1b]/10 bg-white">
              <h3 
                className="font-black text-[#5c0f1b] text-xl"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Tu trufa perfecta
              </h3>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-[#5c0f1b] transition-colors cursor-pointer border-none outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cuerpo del Modal (Formulario) */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <p className="text-sm text-[#2a1115]/70 mb-6 font-medium leading-relaxed">
                Cuéntanos sobre tu evento o idea especial y nos pondremos en contacto contigo por WhatsApp para darte una cotización.
              </p>

              <form id="customization-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="nombre" className="block text-xs font-black text-[#2a1115] uppercase tracking-wide mb-1.5">
                    Nombre completo <span className="text-[#ff7a45]">*</span>
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej. María Pérez"
                    className="w-full bg-white border border-[#5c0f1b]/20 rounded-xl px-4 py-2.5 text-sm text-[#2a1115] focus:outline-none focus:border-[#5c0f1b] focus:ring-1 focus:ring-[#5c0f1b] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="motivo" className="block text-xs font-black text-[#2a1115] uppercase tracking-wide mb-1.5">
                    Motivo o razón <span className="text-[#ff7a45]">*</span>
                  </label>
                  <input
                    type="text"
                    id="motivo"
                    name="motivo"
                    value={formData.motivo}
                    onChange={handleChange}
                    placeholder="Ej. Boda, Cumpleaños, Regalo corporativo"
                    className="w-full bg-white border border-[#5c0f1b]/20 rounded-xl px-4 py-2.5 text-sm text-[#2a1115] focus:outline-none focus:border-[#5c0f1b] focus:ring-1 focus:ring-[#5c0f1b] transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fecha" className="block text-xs font-black text-[#2a1115] uppercase tracking-wide mb-1.5">
                      Fecha del evento <span className="text-[#ff7a45]">*</span>
                    </label>
                    <input
                      type="date"
                      id="fecha"
                      name="fecha"
                      value={formData.fecha}
                      onChange={handleChange}
                      className="w-full bg-white border border-[#5c0f1b]/20 rounded-xl px-4 py-2.5 text-sm text-[#2a1115] focus:outline-none focus:border-[#5c0f1b] focus:ring-1 focus:ring-[#5c0f1b] transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="cantidad" className="block text-xs font-black text-[#2a1115] uppercase tracking-wide mb-1.5">
                      Cantidad aprox. <span className="text-[#ff7a45]">*</span>
                    </label>
                    <input
                      type="number"
                      id="cantidad"
                      name="cantidad"
                      min="1"
                      value={formData.cantidad}
                      onChange={handleChange}
                      placeholder="Ej. 50"
                      className="w-full bg-white border border-[#5c0f1b]/20 rounded-xl px-4 py-2.5 text-sm text-[#2a1115] focus:outline-none focus:border-[#5c0f1b] focus:ring-1 focus:ring-[#5c0f1b] transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="detalles" className="block text-xs font-black text-[#2a1115] uppercase tracking-wide mb-1.5">
                    Detalles de personalización <span className="text-[#ff7a45]">*</span>
                  </label>
                  <textarea
                    id="detalles"
                    name="detalles"
                    value={formData.detalles}
                    onChange={handleChange}
                    placeholder="Sabores preferidos, colores temáticos, empaque especial..."
                    rows={4}
                    className="w-full bg-white border border-[#5c0f1b]/20 rounded-xl px-4 py-2.5 text-sm text-[#2a1115] focus:outline-none focus:border-[#5c0f1b] focus:ring-1 focus:ring-[#5c0f1b] transition-colors resize-none"
                    required
                  />
                </div>
              </form>
            </div>

            {/* Footer del Modal */}
            <div className="p-6 border-t border-[#5c0f1b]/10 bg-white flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-[#5c0f1b] bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer border-none"
              >
                Cancelar
              </button>
              <button
                form="customization-form"
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#ff7a45] text-white font-black text-sm hover:bg-[#e8682e] transition-all active:scale-95 cursor-pointer shadow-md border-none"
              >
                <Send className="h-4 w-4" />
                Enviar por WhatsApp
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
