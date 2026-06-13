/**
 * ArcadeSection.tsx — Sección de la Ruleta Dulce (Arcade).
 *
 * Lógica:
 *   - Costo: 50 CriptoTrufas por jugada (PAGO_JUEGO)
 *   - 2 segundos de animación simulada
 *   - 3 posibles resultados: mala_suerte | puntos_extra | cupon_sorpresa
 *   - Muestra resultado en un modal inline sobre la card
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Dices, AlertTriangle, PartyPopper, Trophy, X } from 'lucide-react'
import { useCriptoTrufaStore } from '@/stores/criptotrufa.store'

const COSTO_JUGADA = 50

export function ArcadeSection() {
  const saldo             = useCriptoTrufaStore((s) => s.saldoActual)
  const girando           = useCriptoTrufaStore((s) => s.ruletaGirando)
  const resultado         = useCriptoTrufaStore((s) => s.ruletaResultado)
  const jugarRuleta       = useCriptoTrufaStore((s) => s.jugarRuleta)
  const dismissResultado  = useCriptoTrufaStore((s) => s.dismissRuletaResultado)

  const puedeJugar = saldo >= COSTO_JUGADA && !girando

  const resultadoIcon = {
    mala_suerte:    <AlertTriangle className="h-10 w-10 text-amber-500" />,
    puntos_extra:   <PartyPopper className="h-10 w-10 text-[#ff7a45]" />,
    cupon_sorpresa: <Trophy className="h-10 w-10 text-[#5c0f1b]" />,
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Card de la Ruleta ── */}
      <div className="bg-white rounded-[22px] overflow-hidden shadow-[0_4px_20px_rgba(92,15,27,0.08)]">

        {/* Header de la card */}
        <div className="bg-gradient-to-r from-[#5c0f1b] to-[#7a1525] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Dices className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3
                className="font-black text-white text-base"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Ruleta Dulce 🎰
              </h3>
              <p className="text-white/60 text-xs font-semibold">¡Prueba tu suerte!</p>
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-5 relative">

          {/* Overlay de resultado */}
          <AnimatePresence>
            {resultado && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 18, stiffness: 200 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white/97 rounded-b-[22px] p-6 text-center"
              >
                {resultadoIcon[resultado.tipo as keyof typeof resultadoIcon]}
                <p
                  className="font-black text-[#2a1115] text-base leading-snug max-w-xs"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {resultado.mensaje}
                </p>
                <button
                  id="arcade-dismiss"
                  onClick={dismissResultado}
                  className="mt-2 flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#5c0f1b] text-white font-black text-sm hover:bg-[#7a1525] transition-all active:scale-95 cursor-pointer border-none shadow-md"
                >
                  <X className="h-3.5 w-3.5" />
                  Cerrar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ruleta visual (ilustración simple) */}
          <div className="flex flex-col items-center gap-4 py-2">
            <motion.div
              animate={girando ? { rotate: 360 } : {}}
              transition={girando ? { repeat: Infinity, duration: 0.6, ease: 'linear' } : {}}
              className={`h-20 w-20 rounded-full border-4 flex items-center justify-center text-3xl ${
                girando ? 'border-[#ff7a45] shadow-[0_0_20px_rgba(255,122,69,0.4)]' : 'border-[#5c0f1b]/20'
              }`}
            >
              🍫
            </motion.div>

            <div className="text-center">
              <p className="text-xs font-bold text-[#2a1115]/40 uppercase tracking-widest mb-0.5">
                Costo por jugada
              </p>
              <p
                className="text-xl font-black text-[#5c0f1b]"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {COSTO_JUGADA} CriptoTrufas
              </p>
            </div>

            <button
              id="arcade-girar-btn"
              onClick={jugarRuleta}
              disabled={!puedeJugar}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-black text-sm transition-all active:scale-95 border-none ${
                puedeJugar
                  ? 'bg-gradient-to-r from-[#ff7a45] to-[#e8682e] text-white hover:opacity-90 shadow-lg cursor-pointer'
                  : 'bg-stone-100 text-stone-400 cursor-not-allowed'
              }`}
            >
              <Dices className="h-4 w-4" />
              {girando
                ? 'Girando…'
                : saldo < COSTO_JUGADA
                  ? 'Saldo insuficiente'
                  : `Girar por ${COSTO_JUGADA} pts`}
            </button>

            {!puedeJugar && !girando && (
              <p className="text-xs text-[#2a1115]/35 font-semibold text-center">
                Necesitas al menos {COSTO_JUGADA} CriptoTrufas para jugar.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Probabilidades ── */}
      <div className="bg-white rounded-[22px] p-5 shadow-[0_2px_8px_rgba(92,15,27,0.05)]">
        <h4
          className="font-black text-[#2a1115] text-sm mb-3 uppercase tracking-widest"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Probabilidades
        </h4>
        <div className="space-y-2">
          {[
            { label: 'Mala suerte',       prob: '50%', color: 'bg-stone-200',    icon: '😔' },
            { label: '100 pts extra',     prob: '30%', color: 'bg-[#ff7a45]/20', icon: '🎉' },
            { label: 'Cupón 30% OFF',     prob: '20%', color: 'bg-[#5c0f1b]/10', icon: '🏆' },
          ].map(({ label, prob, color, icon }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className={`h-7 w-7 rounded-xl flex items-center justify-center text-sm ${color}`}>
                {icon}
              </div>
              <span className="flex-1 text-xs font-semibold text-[#2a1115]/65">{label}</span>
              <span className="text-xs font-black text-[#5c0f1b]">{prob}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
