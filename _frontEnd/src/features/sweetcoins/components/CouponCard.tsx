/**
 * CouponCard.tsx — Tarjeta de cupón propio del cliente (cuponesCliente).
 *
 * Muestra: porcentaje, código único, origen, estado y fecha de expiración.
 * Paleta: borgoña, marrón oscuro, naranja claro.
 */

import { motion } from 'framer-motion'
import { Tag, Clock, CheckCircle, XCircle } from 'lucide-react'
import type { CuponCliente } from '@/stores/criptotrufa.store'

interface CouponCardProps {
  coupon: CuponCliente
  index?: number
}

const ORIGEN_LABELS: Record<CuponCliente['origen'], string> = {
  COMPRA_PUNTOS: 'Canjeado',
  REGALO_ADMIN:  'Regalo',
  PREMIO_JUEGO:  '🏆 Premio',
  REGISTRO_NUEVO:'Bienvenida',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function isExpired(iso: string) {
  return new Date(iso) < new Date()
}

export function CouponCard({ coupon, index = 0 }: CouponCardProps) {
  const expired = isExpired(coupon.fecha_expiracion) || coupon.estado === 'EXPIRADO'
  const used    = coupon.estado === 'USADO'
  const active  = !expired && !used

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className={`relative overflow-hidden rounded-[22px] border flex flex-col min-w-[220px] ${
        active
          ? 'bg-white border-[#5c0f1b]/15 shadow-[0_4px_20px_rgba(92,15,27,0.10)]'
          : 'bg-stone-50 border-stone-200 opacity-60'
      }`}
    >
      {/* ── Franja superior con porcentaje ── */}
      <div
        className={`px-5 py-4 ${
          active
            ? 'bg-gradient-to-r from-[#5c0f1b] to-[#8a1a2e]'
            : 'bg-stone-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-white font-black"
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2rem', lineHeight: 1 }}
          >
            {coupon.cupon.porcentaje_descuento}%
          </span>
          <span className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">OFF</span>
        </div>
        <p className="text-white/80 text-xs font-semibold mt-1 line-clamp-1">
          {coupon.cupon.nombre}
        </p>
      </div>

      {/* ── Separador perforado ── */}
      <div className="flex items-center px-4 py-2 gap-2">
        <div className="h-3 w-3 rounded-full bg-[#faf8f5] -ml-6 border border-stone-200 shrink-0" />
        <div className="flex-1 border-t-2 border-dashed border-stone-200" />
        <div className="h-3 w-3 rounded-full bg-[#faf8f5] -mr-6 border border-stone-200 shrink-0" />
      </div>

      {/* ── Código + meta ── */}
      <div className="px-5 pb-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-[#faf8f5] border border-[#5c0f1b]/10 rounded-xl px-3 py-2">
          <Tag className="h-3.5 w-3.5 text-[#5c0f1b]/50 shrink-0" />
          <span
            className="font-black text-[#5c0f1b] tracking-wider text-sm"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {coupon.codigo_unico}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#2a1115]/45">
            {ORIGEN_LABELS[coupon.origen]}
          </span>
          <div
            className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${
              active
                ? 'text-emerald-700 bg-emerald-50'
                : used
                  ? 'text-stone-500 bg-stone-100'
                  : 'text-red-600 bg-red-50'
            }`}
          >
            {active
              ? <CheckCircle className="h-3 w-3" />
              : <XCircle className="h-3 w-3" />}
            {active ? 'Disponible' : used ? 'Usado' : 'Expirado'}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#2a1115]/40 font-semibold">
          <Clock className="h-3 w-3" />
          <span>Vence: {formatDate(coupon.fecha_expiracion)}</span>
        </div>
      </div>
    </motion.div>
  )
}
