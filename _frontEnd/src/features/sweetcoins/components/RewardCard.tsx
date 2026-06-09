/**
 * RewardCard.tsx — Tarjeta de cupón maestro disponible para canjear (Zona de Recompensas).
 *
 * Muestra: nombre, descripción, porcentaje, costo en puntos y botón de canje.
 * Callback onCanjear dispara useCriptoTrufaStore.canjearCupon().
 */

import { motion } from 'framer-motion'
import { Zap, Gift, Lock } from 'lucide-react'
import type { CuponMaestro } from '@/stores/criptotrufa.store'

interface RewardCardProps {
  reward: CuponMaestro
  saldoActual: number
  onCanjear: (id_cupon: number) => void
  index?: number
}

export function RewardCard({ reward, saldoActual, onCanjear, index = 0 }: RewardCardProps) {
  const puedeCanjear  = !!reward.costo_puntos && saldoActual >= reward.costo_puntos
  const puntajeActual = reward.costo_puntos ?? 0
  const progreso      = Math.min(100, (saldoActual / puntajeActual) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className="bg-white rounded-[22px] border border-[#5c0f1b]/10 p-5 flex flex-col gap-4 shadow-[0_2px_12px_rgba(92,15,27,0.07)] hover:shadow-[0_6px_24px_rgba(92,15,27,0.12)] hover:-translate-y-0.5 transition-all duration-250"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#5c0f1b] to-[#8a1a2e] flex items-center justify-center shrink-0 shadow-md">
          <Gift className="h-5 w-5 text-white" />
        </div>
        <div
          className="text-2xl font-black text-[#5c0f1b] leading-none"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {reward.porcentaje_descuento}%
          <span className="text-xs font-black text-[#5c0f1b]/40 ml-0.5">OFF</span>
        </div>
      </div>

      {/* Nombre + descripción */}
      <div>
        <h3
          className="font-black text-[#2a1115] text-base mb-1 leading-tight"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {reward.nombre}
        </h3>
        {reward.descripcion && (
          <p className="text-xs text-[#2a1115]/50 font-medium leading-relaxed line-clamp-2">
            {reward.descripcion}
          </p>
        )}
      </div>

      {/* Barra de progreso */}
      {reward.costo_puntos && (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2a1115]/40">
              Progreso
            </span>
            <span className="text-[10px] font-black text-[#5c0f1b]">
              {saldoActual.toLocaleString()} / {reward.costo_puntos.toLocaleString()} pts
            </span>
          </div>
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progreso}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 }}
              className={`h-full rounded-full ${puedeCanjear ? 'bg-gradient-to-r from-[#ff7a45] to-[#e8682e]' : 'bg-[#5c0f1b]/30'}`}
            />
          </div>
        </div>
      )}

      {/* Vigencia */}
      <p className="text-[10px] text-[#2a1115]/35 font-semibold">
        Válido {reward.dias_vigencia} días desde el canje
      </p>

      {/* Botón canje */}
      <button
        id={`reward-canjear-${reward.id_cupon}`}
        onClick={() => onCanjear(reward.id_cupon)}
        disabled={!puedeCanjear}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-full font-black text-sm transition-all active:scale-95 cursor-pointer border-none ${
          puedeCanjear
            ? 'bg-gradient-to-r from-[#5c0f1b] to-[#8a1a2e] text-white hover:opacity-90 shadow-md'
            : 'bg-stone-100 text-stone-400 cursor-not-allowed'
        }`}
      >
        {puedeCanjear
          ? <><Zap className="h-3.5 w-3.5" /> Canjear: {reward.costo_puntos?.toLocaleString()} Pts</>
          : <><Lock className="h-3.5 w-3.5" /> {reward.costo_puntos?.toLocaleString()} Pts requeridos</>}
      </button>
    </motion.div>
  )
}
