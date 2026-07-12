/**
 * HeroSection.tsx — Sección Hero de la HomePage pública
 *
 * SRP: renderizar únicamente el bloque hero (texto + imagen de fondo).
 * Recibe un callback para hacer scroll al catálogo.
 *
 * OPTIMIZACIÓN (v3):
 *   - Imagen de fondo: /4.webp (62KB vs 2.4MB PNG), preload en index.html
 *   - Animaciones con CSS (no framer-motion) para no bloquear el LCP
 *   - <img> con fetchpriority="high" en vez de CSS background-image
 */

import { Button } from '@/shared/components/ui/Button'

// ─── Props ────────────────────────────────────────────────────────────────

interface HeroSectionProps {
  onCatalogClick: () => void
}

// ─── Datos estáticos ──────────────────────────────────────────────────────

const STATS = [
  { value: '+500', label: 'Clientes felices' },
  { value: '100%', label: 'Artesanal' },
  { value: '4.9★', label: 'Calificación' },
] as const

// ─── Componente ───────────────────────────────────────────────────────────

export function HeroSection({ onCatalogClick }: HeroSectionProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ minHeight: '100vh' }}
    >
      {/* Imagen de fondo — mármol con trufas (alineada a la derecha) */}
      {/* Usamos <img> con fetchpriority="high" para optimizar el LCP */}
      <img
        src="/4.webp"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        width={1600}
        height={716}
        className="absolute inset-0 h-full w-full object-cover object-right bg-[#5c0f1b]"
      />

      {/* Overlay izquierdo — menos intenso y rojizo (borgoña) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(255, 122, 69, 0.95) 10%, rgba(255, 122, 69, 0.65) 30%, rgba(255, 122, 69, 0.15) 65%, transparent 70%)',
        }}
      />

      {/* Contenido */}
      <div
        className="relative z-10 max-w-7xl mx-auto px-2 md:px-10 flex items-start pt-8 md:pt-[10vh]"
        style={{ minHeight: '100vh' }}
      >
        {/* ── Columna de texto (animación CSS stagger) — máximo 50% del ancho ── */}
        <div className="flex flex-col items-start text-left w-full max-w-[860px] hero-stagger">
          {/* Etiqueta superior */}
          <span className="hero-item inline-flex items-center gap-1.5 mb-6 text-[15px] font-black uppercase tracking-[0.2em] text-white/90 border-white/20 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
            🍫 La Trufería de Élite
          </span>

          {/* Titular principal — blanco, grande, negrita */}
          <h1
            className="hero-item font-black text-[var(--color-primary)] leading-[1.04] mb-6"
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2.6rem, 5.5vw, 4.2rem)' }}
          >
            El antojo perfecto
            <br />
            <span className="text-[var(--color-primary)]">que te recompensa.</span>
          </h1>

          {/* Subtítulo — blanco */}
          <p className="hero-item text-base md:text-lg font-light mb-9 leading-[1.75] max-w-[460px]">
            <span className="text-[#ffffff] font-normal">
              Gana puntos <strong className="text-[#892700] font-black">CriptoTrufas</strong> por cada
              compra.{' '}
            </span>
            <span className="text-white font-semibold">
              Canjéalos por descuentos y más trufas.
            </span>
          </p>

          {/* Stats */}
          <div className="hero-item flex items-center gap-8 md:gap-10 mb-10">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p
                  className="text-2xl font-black text-white leading-none"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {value}
                </p>
                <p className="text-[11px] text-white/60 font-semibold mt-0.5 uppercase tracking-wider">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="hero-item">
            <Button
              id="hp-hero-cta"
              variant="primary"
              onClick={onCatalogClick}
              className="px-10 py-4 text-base shadow-[0_8px_24px_rgba(92,15,27,0.22)] transition-transform hover:scale-105 active:scale-95"
            >
              Ver Catálogo
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
