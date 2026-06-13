/**
 * InfoModal.tsx — Modal de Información Adicional del Producto.
 *
 * Muestra datos detallados del producto basados en el esquema de BD:
 *   - descripcion (larga)
 *   - ingredientes
 *   - alergenos
 *   - peso_gramos
 *   - consideraciones_almacenamiento
 *   - tiempo_vida_dias
 *   - fecha_actualizacion
 *
 * Patrón de overlay/spring idéntico al resto de modales del proyecto.
 * Cierre: botón X, click en overlay, tecla Escape.
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Info,
  Leaf,
  AlertTriangle,
  Scale,
  Thermometer,
  Clock,
  Calendar,
  CheckCircle,
} from 'lucide-react'
import type { Producto } from '../types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface InfoModalProps {
  product: Producto
  isOpen: boolean
  onClose: () => void
}

// ─── Sub-componente: fila de dato ─────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  accent = false,
  warning = false,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent?: boolean
  warning?: boolean
}) {
  return (
    <div
      className={`flex gap-3 p-3.5 rounded-xl  transition-colors ${
        warning
          ? 'bg-amber-50 border-amber-200'
          : accent
            ? 'bg-[#5c0f1b]/4 border-[#5c0f1b]/12'
            : 'bg-[#faf8f5] border-[#5c0f1b]/8'
      }`}
    >
      <div
        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
          warning
            ? 'bg-amber-100'
            : accent
              ? 'bg-[#5c0f1b]/10'
              : 'bg-[#5c0f1b]/6'
        }`}
      >
        <Icon
          className={`h-4 w-4 ${
            warning ? 'text-amber-600' : 'text-[#5c0f1b]'
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#2a1115]/45 mb-0.5">
          {label}
        </p>
        <p
          className={`text-sm font-semibold leading-relaxed ${
            warning ? 'text-amber-800' : 'text-[#2a1115]'
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function InfoModal({ product, isOpen, onClose }: InfoModalProps) {
  // Escape + scroll lock
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

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[300] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="bg-white w-full max-w-lg rounded-[28px] overflow-hidden shadow-2xl  border-[#5c0f1b]/10 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Información adicional de ${product.nombre}`}
          >
            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-[#5c0f1b] to-[#7a1525] px-6 pt-5 pb-5 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="h-4 w-4 text-white/70" />
                    <span className="text-xs font-black uppercase tracking-widest text-white/60">
                      Información Adicional
                    </span>
                  </div>
                  <h2
                    className="font-black text-white text-xl leading-tight"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {product.nombre}
                  </h2>
                  {product.categoria_nombre && (
                    <span className="inline-block mt-1.5 text-xs font-bold text-white/60 bg-white/10 px-2.5 py-0.5 rounded-full">
                      {product.categoria_nombre}
                    </span>
                  )}
                </div>
                <button
                  id="info-modal-close"
                  onClick={onClose}
                  aria-label="Cerrar información adicional"
                  className="p-2 rounded-full bg-white/15 text-white hover:bg-white/25 hover:scale-110 active:scale-90 transition-all cursor-pointer border-none shrink-0 mt-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Cuerpo scrollable ── */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">

              {/* Descripción */}
              {product.descripcion && (
                <InfoRow
                  icon={CheckCircle}
                  label="Descripción"
                  value={product.descripcion}
                  accent
                />
              )}

              {/* Ingredientes */}
              {product.ingredientes && (
                <InfoRow
                  icon={Leaf}
                  label="Ingredientes"
                  value={product.ingredientes}
                />
              )}

              {/* Alérgenos */}
              {product.alergenos && (
                <InfoRow
                  icon={AlertTriangle}
                  label="⚠ Información sobre alérgenos"
                  value={product.alergenos}
                  warning
                />
              )}

              {/* Peso */}
              {product.peso_gramos && (
                <InfoRow
                  icon={Scale}
                  label="Peso por unidad"
                  value={`${product.peso_gramos} gramos`}
                />
              )}

              {/* Almacenamiento */}
              {product.consideraciones_almacenamiento && (
                <InfoRow
                  icon={Thermometer}
                  label="Consideraciones de almacenamiento"
                  value={product.consideraciones_almacenamiento}
                />
              )}

              {/* Vida útil */}
              {product.tiempo_vida_dias && (
                <InfoRow
                  icon={Clock}
                  label="Vida útil"
                  value={`${product.tiempo_vida_dias} días desde elaboración`}
                />
              )}

              {/* Última actualización */}
              <InfoRow
                icon={Calendar}
                label="Última actualización"
                value={formatDate(product.fecha_actualizacion)}
              />

              {/* Nota legal */}
              <p className="text-[11px] text-[#2a1115]/35 font-medium text-center pt-1 pb-2 leading-relaxed">
                Elaborado artesanalmente en Lima, Perú. Puede contener trazas de frutos secos,
                lácteos y gluten por producción compartida.
              </p>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t border-[#5c0f1b]/8 shrink-0">
              <button
                id="info-modal-confirm"
                onClick={onClose}
                className="w-full py-3 rounded-full bg-[#5c0f1b] text-white font-black text-sm hover:bg-[#7a1525] transition-all active:scale-95 cursor-pointer border-none"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
