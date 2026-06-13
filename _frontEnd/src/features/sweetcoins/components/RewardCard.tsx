/**
 * RewardCard.tsx — Tarjeta de cupón maestro disponible para canjear (Zona de Recompensas).
 *
 * Hover:
 *   - Elevación: translateY(-10px) + scale(1.03) via framer-motion
 *   - Background: blanco → borgoña #5c0f1b
 *   - Textos: oscuros → blancos
 *   - Sombra: suave → profunda borgoña
 *   - Icono Gift: fondo blanco en hover
 */

import { useState } from 'react'
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

  const [hovered, setHovered] = useState(false)

  // ── Tokens de color reactivos al hover ────────────────────────────────────
  const bg         = hovered ? '#5c0f1b'            : '#ffffff'
  const titleColor = hovered ? 'rgba(255,255,255,1)' : '#2a1115'
  const descColor  = hovered ? 'rgba(255,255,255,0.7)' : 'rgba(42,17,21,0.50)'
  const pctColor   = hovered ? 'rgba(255,255,255,1)' : '#5c0f1b'
  const pctOffColor= hovered ? 'rgba(255,255,255,0.5)' : 'rgba(92,15,27,0.40)'
  const vigColor   = hovered ? 'rgba(255,255,255,0.45)' : 'rgba(42,17,21,0.35)'
  const labelColor = hovered ? 'rgba(255,255,255,0.5)' : 'rgba(42,17,21,0.40)'
  const ptColor    = hovered ? 'rgba(255,200,150,1)' : '#5c0f1b'
  const trackBg    = hovered ? 'rgba(255,255,255,0.15)' : '#e7e5e4'
  const shadow     = hovered
    ? '0 24px 56px rgba(92,15,27,0.35), 0 10px 24px rgba(92,15,27,0.25)'
    : '0 4px 20px rgba(92,15,27,0.10)'
  const iconBg     = hovered
    ? 'rgba(255,255,255,0.18)'
    : 'linear-gradient(135deg, #5c0f1b, #8a1a2e)'
  const iconColor  = '#ffffff'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', damping: 22, stiffness: 90 }}
      whileHover={{ y: -10, scale: 1.03 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={()   => setHovered(false)}
      style={{
        backgroundColor: bg,
        boxShadow: shadow,
        borderRadius: '22px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        cursor: 'pointer',
        willChange: 'transform',
        transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* ── Header: icono + porcentaje ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        {/* Icono Gift */}
        <div
          style={{
            height: '44px',
            width: '44px',
            borderRadius: '16px',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: hovered ? 'none' : '0 4px 12px rgba(92,15,27,0.3)',
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          <Gift style={{ height: '20px', width: '20px', color: iconColor }} />
        </div>

        {/* Porcentaje */}
        <div
          style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            color: pctColor,
            lineHeight: 1,
            fontFamily: "'Outfit', sans-serif",
            transition: 'color 0.3s ease',
          }}
        >
          {reward.porcentaje_descuento}%
          <span style={{ fontSize: '0.75rem', color: pctOffColor, marginLeft: '2px', transition: 'color 0.3s ease' }}>
            OFF
          </span>
        </div>
      </div>

      {/* ── Nombre + descripción ── */}
      <div>
        <h3
          style={{
            fontWeight: 900,
            color: titleColor,
            fontSize: '1rem',
            marginBottom: '4px',
            lineHeight: 1.25,
            fontFamily: "'Outfit', sans-serif",
            transition: 'color 0.3s ease',
          }}
        >
          {reward.nombre}
        </h3>
        {reward.descripcion && (
          <p
            style={{
              fontSize: '0.75rem',
              color: descColor,
              fontWeight: 500,
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              transition: 'color 0.3s ease',
            }}
          >
            {reward.descripcion}
          </p>
        )}
      </div>

      {/* ── Barra de progreso ── */}
      {reward.costo_puntos && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: labelColor, transition: 'color 0.3s ease' }}>
              Progreso
            </span>
            <span style={{ fontSize: '10px', fontWeight: 900, color: ptColor, transition: 'color 0.3s ease' }}>
              {saldoActual.toLocaleString()} / {reward.costo_puntos.toLocaleString()} pts
            </span>
          </div>
          <div style={{ height: '6px', backgroundColor: trackBg, borderRadius: '9999px', overflow: 'hidden', transition: 'background-color 0.3s ease' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progreso}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 }}
              style={{
                height: '100%',
                borderRadius: '9999px',
                background: puedeCanjear
                  ? 'linear-gradient(to right, #ff7a45, #e8682e)'
                  : hovered ? 'rgba(255,255,255,0.35)' : 'rgba(92,15,27,0.30)',
                transition: 'background 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Vigencia ── */}
      <p style={{ fontSize: '10px', color: vigColor, fontWeight: 600, transition: 'color 0.3s ease' }}>
        Válido {reward.dias_vigencia} días desde el canje
      </p>

      {/* ── Botón canje ── */}
      <button
        id={`reward-canjear-${reward.id_cupon}`}
        onClick={() => onCanjear(reward.id_cupon)}
        disabled={!puedeCanjear}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          paddingTop: '12px',
          paddingBottom: '12px',
          borderRadius: '9999px',
          fontWeight: 900,
          fontSize: '0.875rem',
          border: 'none',
          cursor: puedeCanjear ? 'pointer' : 'not-allowed',
          background: puedeCanjear
            ? hovered
              ? 'rgba(255,255,255,0.95)'
              : 'linear-gradient(to right, #5c0f1b, #8a1a2e)'
            : hovered
              ? 'rgba(255,255,255,0.12)'
              : '#f5f5f4',
          color: puedeCanjear
            ? hovered ? '#5c0f1b' : '#ffffff'
            : hovered ? 'rgba(255,255,255,0.45)' : '#a8a29e',
          boxShadow: puedeCanjear && !hovered ? '0 4px 14px rgba(92,15,27,0.25)' : 'none',
          transition: 'background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {puedeCanjear
          ? <><Zap style={{ height: '14px', width: '14px' }} /> Canjear: {reward.costo_puntos?.toLocaleString()} Pts</>
          : <><Lock style={{ height: '14px', width: '14px' }} /> {reward.costo_puntos?.toLocaleString()} Pts requeridos</>}
      </button>
    </motion.div>
  )
}
