/**
 * SharedMomentsSection.tsx — Sección "Momentos Compartidos" (v2 — rediseño premium)
 *
 * Layout editorial tipo revista: imagen hero + panel derecho asimétrico.
 * Sombras profundas, hover con scale suave, overlays con gradiente borgoña.
 * Tarjeta cita flotante con tipografía de autor y línea decorativa naranja.
 */

import { motion, type Variants } from 'framer-motion'
import { Quote } from 'lucide-react'

// ─── Variantes de animación ───────────────────────────────────────────────────

const headingReveal: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 24, stiffness: 90 },
  },
}

const heroImageVariant: Variants = {
  hidden: { opacity: 0, scale: 0.96, x: -30 },
  show: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: { type: 'spring', damping: 26, stiffness: 80, delay: 0.1 },
  },
}

const panelTopVariant: Variants = {
  hidden: { opacity: 0, y: -24, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 26, stiffness: 85, delay: 0.2 },
  },
}

const quoteCardVariant: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 22, stiffness: 80, delay: 0.35 },
  },
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function SharedMomentsSection() {
  return (
    <section
      className="relative py-20 md:py-28 px-4 md:px-8 overflow-hidden"
      style={{ backgroundColor: '#1a0509' }}
    >
      {/* ── Ruido de fondo decorativo ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px',
        }}
      />

      {/* ── Blob decorativo borgoña ── */}
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(92,15,27,0.35) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute -bottom-24 -left-24 w-[380px] h-[380px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(255,122,69,0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* ── Encabezado ── */}
        <motion.div
          variants={headingReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="mb-14 md:mb-18 flex flex-col items-start md:flex-row md:items-end md:justify-between gap-4"
        >
          <div>
            <span className="inline-block text-[11px] font-black uppercase tracking-[0.28em] text-[#ff7a45] mb-4">
              — Nuestra historia
            </span>
            <h2
              className="font-black leading-[1.06] text-white"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              }}
            >
              Momentos{' '}
              <span
                style={{
                  WebkitTextStroke: '1.5px rgba(255,255,255,0.6)',
                  color: 'transparent',
                }}
              >
                Compartidos
              </span>
            </h2>
          </div>

          <p className="text-white/40 text-sm md:text-base font-normal italic max-w-[280px] text-left md:text-right leading-relaxed">
            Capturando la dulzura<br />de la vida diaria.
          </p>
        </motion.div>

        {/* ── Grid principal ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_420px] gap-5 md:gap-5 items-stretch">

          {/* ── Imagen hero izquierda ── */}
          <motion.div
            variants={heroImageVariant}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="relative group overflow-hidden rounded-[2rem] cursor-pointer h-[320px] md:h-[360px]"
            style={{
              boxShadow:
                '0 40px 80px rgba(0,0,0,0.5), 0 16px 32px rgba(92,15,27,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <picture>
              <source srcSet="/9.webp" type="image/webp" />
              <img
                src="/9.png"
                alt="Preparación artesanal de trufas Mitrufely"
                width={1000}
                height={989}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </picture>

            {/* Overlay gradiente permanente */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, transparent 45%, rgba(26,5,9,0.75) 100%)',
              }}
            />

            {/* Overlay hover borgoña */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'rgba(92,15,27,0.25)',
              }}
            />

            {/* Badge inferior izquierda */}
            <div className="absolute bottom-6 left-6 flex items-center gap-3">
              <div
                className="h-2 w-2 rounded-full bg-[#ff7a45] animate-pulse"
              />
              <span className="text-xs font-black uppercase tracking-widest text-white/80">
                Hecho con amor · Cada día
              </span>
            </div>

            {/* Borde sutil animado en hover */}
            <div
              className="absolute inset-0 rounded-[2rem] border border-white/0 group-hover:border-white/10 transition-all duration-500"
            />
          </motion.div>

          {/* ── Panel derecho ── */}
          <div className="flex flex-col gap-5">

            {/* Imagen superior derecha */}
            <motion.div
              variants={panelTopVariant}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="relative group overflow-hidden rounded-[2rem] h-[180px] cursor-pointer"
              style={{
                boxShadow:
                  '0 24px 56px rgba(0,0,0,0.45), 0 8px 20px rgba(92,15,27,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <picture>
                <source srcSet="/10.webp" type="image/webp" />
                <img
                  src="/10.png"
                  alt="Trufas artesanales Mitrufely listas para degustar"
                  width={1000}
                  height={957}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </picture>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(26,5,9,0.30) 0%, transparent 60%)',
                }}
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'rgba(255,122,69,0.12)' }}
              />

              {/* Etiqueta flotante */}
              <div className="absolute top-4 right-4">
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(255,122,69,0.18)',
                    backdropFilter: 'blur(12px)',
                    color: '#ff9d6b',
                    border: '1px solid rgba(255,122,69,0.25)',
                  }}
                >
                  🍫 Artesanal
                </span>
              </div>
            </motion.div>

            {/* Tarjeta de cita */}
            <motion.div
              variants={quoteCardVariant}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="relative overflow-hidden rounded-[2rem] px-8 py-8 flex flex-col justify-between gap-6"
              style={{
                background:
                  'linear-gradient(135deg, rgba(92,15,27,0.85) 0%, rgba(60,8,16,0.95) 100%)',
                border: '1px solid rgba(255,122,69,0.15)',
                boxShadow:
                  '0 24px 56px rgba(0,0,0,0.4), 0 8px 20px rgba(92,15,27,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Blob interno decorativo */}
              <div
                className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, rgba(255,122,69,0.18) 0%, transparent 70%)',
                }}
              />

              {/* Icono de cita */}
              <div
                className="relative z-10 h-12 w-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,122,69,0.15)' }}
              >
                <Quote className="h-5 w-5 text-[#ff7a45]" strokeWidth={2} />
              </div>

              {/* Texto de la cita */}
              <div className="relative z-10">
                <p
                  className="text-white font-bold leading-[1.5]"
                  style={{ fontSize: 'clamp(1.05rem, 1.8vw, 1.25rem)' }}
                >
                  El secreto es el{' '}
                  <em className="not-italic text-[#ff9d6b]">
                    amor en cada detalle.
                  </em>
                </p>
              </div>

              {/* Línea autora */}
              <div className="relative z-10 flex items-center gap-4">
                <div
                  className="h-px flex-1"
                  style={{
                    background:
                      'linear-gradient(to right, rgba(255,122,69,0.5), transparent)',
                  }}
                />
                <div className="text-right">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ff7a45]">
                    Mitrufely
                  </p>
                  <p className="text-[10px] text-white/35 font-medium mt-0.5">
                    Repostería Artesanal
                  </p>
                </div>
              </div>

              {/* Borde naranja inferior decorativo */}
              <div
                className="absolute bottom-0 left-8 right-8 h-[2px] rounded-full"
                style={{
                  background:
                    'linear-gradient(to right, transparent, rgba(255,122,69,0.6), transparent)',
                }}
              />
            </motion.div>

          </div>
        </div>

      </div>
    </section>
  )
}
