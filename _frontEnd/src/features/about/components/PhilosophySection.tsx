/**
 * PhilosophySection.tsx — Sección "Nuestra Filosofía"
 *
 * SRP: Grid de 3 tarjetas de filosofía con iconos lucide-react.
 * Iconos y acentos en borgoña/naranja — sin rosa.
 */

import { motion, type Variants } from 'framer-motion'
import { Gem, HandHeart, UtensilsCrossed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PhilosophyCard {
  id: string
  Icon: LucideIcon
  title: string
  description: string
  /** Color del ícono y acento de la tarjeta */
  accentColor: string
  /** Fondo suave del icono badge */
  iconBg: string
}

// ─── Datos estáticos ──────────────────────────────────────────────────────────

const PHILOSOPHY_CARDS: readonly PhilosophyCard[] = [
  {
    id: 'premium-ingredients',
    Icon: Gem,
    title: 'Ingredientes Premium',
    description:
      'Seleccionamos meticulosamente cada ingrediente, desde cacaos de origen único hasta mantequillas de granja, asegurando que solo lo mejor llegue a tu paladar.',
    accentColor: '#5c0f1b',
    iconBg: '#5c0f1b14',
  },
  {
    id: 'handmade',
    Icon: HandHeart,
    title: 'Hecho a Mano',
    description:
      'Cada detalle es moldeado, horneado y decorado por manos expertas. Prescindimos de la producción en masa para honrar la artesanía de la repostería clásica.',
    accentColor: '#c05000',
    iconBg: '#ff7a4514',
  },
  {
    id: 'homemade-flavor',
    Icon: UtensilsCrossed,
    title: 'Sabor Casero',
    description:
      'Buscamos evocar la calidez y el reconfortante sabor de las recetas familiares, elevadas con un toque de sofisticación contemporánea.',
    accentColor: '#5c0f1b',
    iconBg: '#5c0f1b14',
  },
] as const

// ─── Variantes ────────────────────────────────────────────────────────────────

const sectionFadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 22, stiffness: 90 },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 22, stiffness: 90 },
  },
}

const gridVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

// ─── Sub-componente: tarjeta individual ───────────────────────────────────────

interface PhilosophyCardProps {
  card: PhilosophyCard
}

function PhilosophyCardItem({ card }: PhilosophyCardProps) {
  const { Icon, title, description, accentColor, iconBg } = card

  return (
    <motion.article
      variants={cardVariants}
      className="bg-white rounded-3xl px-7 py-8 flex flex-col gap-5 shadow-[0_4px_20px_rgba(92,15,27,0.07)] hover:shadow-[0_8px_32px_rgba(92,15,27,0.13)] transition-shadow duration-300 group"
    >
      {/* Icono badge */}
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{ backgroundColor: iconBg }}
      >
        <Icon
          className="h-7 w-7"
          style={{ color: accentColor }}
          strokeWidth={1.8}
        />
      </div>

      {/* Texto */}
      <div className="flex flex-col gap-2">
        <h3
          className="font-black text-[#2a1115] text-[1.05rem] leading-tight"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-[#2a1115]/60 text-sm leading-[1.75] font-normal">
          {description}
        </p>
      </div>

      {/* Línea acento inferior */}
      <div
        className="h-0.5 w-8 rounded-full mt-auto opacity-60"
        style={{ backgroundColor: accentColor }}
      />
    </motion.article>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PhilosophySection() {
  return (
    <section className="bg-white py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Encabezado */}
        <motion.div
          variants={sectionFadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-6"
        >
          <h2
            className="font-black text-[#5c0f1b]"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)',
            }}
          >
            Nuestra Filosofía
          </h2>
        </motion.div>

        {/* Descripción introductoria */}
        <motion.p
          variants={sectionFadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="text-center text-[#2a1115]/65 text-sm md:text-base leading-[1.8] max-w-2xl mx-auto mb-14"
        >
          En Mitrufely, creemos que la verdadera indulgencia proviene de la
          calidad sin concesiones. Cada creación es un testimonio de nuestra
          dedicación al arte de la repostería, combinando técnicas tradicionales
          con un enfoque moderno para ofrecer experiencias memorables.
        </motion.p>

        {/* Grid de tarjetas */}
        <motion.div
          variants={gridVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {PHILOSOPHY_CARDS.map((card) => (
            <PhilosophyCardItem key={card.id} card={card} />
          ))}
        </motion.div>

      </div>
    </section>
  )
}
