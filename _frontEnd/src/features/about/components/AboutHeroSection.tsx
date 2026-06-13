/**
 * AboutHeroSection.tsx — Sección hero de la vista Nosotros
 *
 * SRP: Renderizar únicamente el bloque hero con texto e imagen.
 * Fondo blanco/crema, sin elementos rosas, paleta oficial borgoña + naranja.
 */

import { motion, type Variants } from 'framer-motion'

// ─── Variantes ────────────────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 22, stiffness: 100 },
  },
}

const imageVariants: Variants = {
  hidden: { opacity: 0, x: 32, scale: 0.97 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', damping: 24, stiffness: 90, delay: 0.2 },
  },
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function AboutHeroSection() {
  return (
    <section className="bg-white py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">

        {/* ── Columna de texto ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-start"
        >
          {/* Etiqueta */}
          <motion.span
            variants={itemVariants}
            className="inline-flex items-center gap-2 mb-5 text-xs font-black uppercase tracking-[0.22em] text-[#5c0f1b] bg-[#5c0f1b]/8 px-4 py-2 rounded-full"
          >
            🍫 Quiénes somos
          </motion.span>

          {/* Titular */}
          <motion.h1
            variants={itemVariants}
            className="font-black leading-[1.08] mb-6 text-[#2a1115]"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(2rem, 4.5vw, 3.4rem)',
            }}
          >
            Tu Experiencia,{' '}
            <span className="text-[#5c0f1b]">Nuestra Misión</span>
          </motion.h1>

          {/* Descripción */}
          <motion.p
            variants={itemVariants}
            className="text-[#2a1115]/70 text-base md:text-lg leading-[1.8] max-w-[480px] font-normal"
          >
            Creemos que cada dulce es una oportunidad para crear un recuerdo
            inolvidable. Nuestra pasión no solo está en los ingredientes, sino
            en las sonrisas que generamos al compartirlos.
          </motion.p>

          {/* Separador decorativo */}
          <motion.div
            variants={itemVariants}
            className="mt-8 flex items-center gap-3"
          >
            <div className="h-1 w-12 rounded-full bg-[#5c0f1b]" />
            <div className="h-1 w-6 rounded-full bg-[#ff7a45]" />
            <div className="h-1 w-3 rounded-full bg-[#5c0f1b]/25" />
          </motion.div>
        </motion.div>

        {/* ── Imagen ── */}
        <motion.div
          variants={imageVariants}
          initial="hidden"
          animate="show"
          className="relative"
        >
          <div className="relative overflow-hidden rounded-3xl shadow-[0_20px_60px_rgba(92,15,27,0.15)]">
            <img
              src="/8.png"
              alt="Equipo Mitrufely compartiendo momentos dulces"
              className="w-full h-[340px] md:h-[420px] object-cover"
            />
            {/* Overlay sutil borgoña en la parte inferior */}
            <div
              className="absolute inset-0 rounded-3xl"
              style={{
                background:
                  'linear-gradient(to top, rgba(92,15,27,0.18) 0%, transparent 55%)',
              }}
            />
          </div>

          {/* Tarjeta decorativa flotante */}
          <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-[0_8px_32px_rgba(92,15,27,0.14)] px-5 py-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#5c0f1b]/10 flex items-center justify-center shrink-0">
              <span className="text-lg">🏆</span>
            </div>
            <div>
              <p className="text-xs font-black text-[#5c0f1b] leading-none mb-0.5">
                +500 clientes
              </p>
              <p className="text-[11px] text-[#2a1115]/50 font-medium">
                confían en nosotros
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
