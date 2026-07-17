import { motion, type Variants } from 'framer-motion'
import { Gem, HandHeart, UtensilsCrossed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PhilosophyCard {
  id: string
  Icon: LucideIcon
  title: string
  description: string
  gradient: string
  shadowColor: string
}

// ─── Datos estáticos ──────────────────────────────────────────────────────────

const PHILOSOPHY_CARDS: readonly PhilosophyCard[] = [
  {
    id: 'premium-ingredients',
    Icon: Gem,
    title: 'Ingredientes Premium',
    description:
      'Seleccionamos meticulosamente cada ingrediente, desde cacaos de origen único hasta mantequillas de granja, asegurando que solo lo mejor llegue a tu paladar.',
    gradient: 'from-[#5c0f1b] to-[#8a1729]',
    shadowColor: 'rgba(92,15,27,0.3)',
  },
  {
    id: 'handmade',
    Icon: HandHeart,
    title: 'Hecho a Mano',
    description:
      'Cada detalle es moldeado, horneado y decorado por manos expertas. Prescindimos de la producción en masa para honrar la artesanía de la repostería clásica.',
    gradient: 'from-[#ff7a45] to-[#ffa382]',
    shadowColor: 'rgba(255,122,69,0.35)',
  },
  {
    id: 'homemade-flavor',
    Icon: UtensilsCrossed,
    title: 'Sabor Casero',
    description:
      'Buscamos evocar la calidez y el reconfortante sabor de las recetas familiares, elevadas con un toque de sofisticación contemporánea.',
    gradient: 'from-[#c05000] to-[#e8682e]',
    shadowColor: 'rgba(192,80,0,0.3)',
  },
] as const

// ─── Variantes ────────────────────────────────────────────────────────────────

const sectionFadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

const gridVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

// ─── Sub-componente: tarjeta individual ───────────────────────────────────────

interface PhilosophyCardProps {
  card: PhilosophyCard
}

function PhilosophyCardItem({ card }: PhilosophyCardProps) {
  const { Icon, title, description, gradient, shadowColor } = card

  return (
    <motion.article
      variants={cardVariants}
      className="relative bg-white rounded-[32px] p-8 md:p-10 flex flex-col gap-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_48px_rgba(0,0,0,0.08)] transition-all duration-500 group  overflow-hidden"
    >
      {/* Decorative gradient blob inside card on hover */}
      <div
        className={`absolute -top-24 -right-24 w-56 h-56 rounded-full opacity-0 group-hover:opacity-[0.07] transition-opacity duration-700 bg-gradient-to-br ${gradient}`}
        style={{ filter: 'blur(40px)' }}
      />

      {/* Icono badge */}
      <div
        className={`relative h-16 w-16 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 bg-gradient-to-br ${gradient}`}
        style={{ boxShadow: `0 8px 24px ${shadowColor}` }}
      >
        <Icon className="h-8 w-8 text-white" strokeWidth={1.8} />
      </div>

      {/* Texto */}
      <div className="relative flex flex-col gap-3 z-10">
        <h3
          className="font-black text-[#2a1115] text-xl md:text-2xl leading-tight group-hover:text-[#5c0f1b] transition-colors duration-300"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-[#2a1115]/65 text-[15px] leading-relaxed font-medium">{description}</p>
      </div>

      {/* Línea acento inferior interactiva */}
      <div className="relative mt-auto pt-6 overflow-hidden">
        <div className="h-[3px] w-12 rounded-full bg-stone-200 transition-all duration-500 group-hover:w-full group-hover:opacity-0" />
        <div
          className={`absolute top-6 left-0 h-[3px] w-full rounded-full bg-gradient-to-r ${gradient} -translate-x-[101%] group-hover:translate-x-0 transition-transform duration-700 ease-out`}
        />
      </div>
    </motion.article>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PhilosophySection() {
  return (
    <section className="relative bg-[#faf8f5] py-24 md:py-32 px-4 md:px-8 overflow-hidden">
      {/* ── Elementos Decorativos de Fondo ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#ff7a45]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[#5c0f1b]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-32 w-[400px] h-[400px] bg-[#ff7a45]/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Encabezado */}
        <motion.div
          variants={sectionFadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-16"
        >
          <span className="inline-block bg-[#ff7a45]/10 text-[#ff7a45] text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-4">
            Nuestra Esencia
          </span>
          <h2
            className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5c0f1b] to-[#c05000]"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)',
            }}
          >
            Nuestra Filosofía
          </h2>
          <div className="mx-auto mt-6 h-[3px] w-16 rounded-full bg-gradient-to-r from-[#5c0f1b] to-[#ff7a45]" />
        </motion.div>

        {/* Descripción introductoria */}
        <motion.p
          variants={sectionFadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="text-center text-[#2a1115]/70 text-base md:text-lg font-medium leading-[1.8] max-w-3xl mx-auto mb-16"
        >
          En <span className="font-bold text-[#5c0f1b]">Mitrufely</span>, creemos que la verdadera
          indulgencia proviene de la calidad sin concesiones. Cada creación es un testimonio de
          nuestra dedicación al arte de la repostería, combinando técnicas tradicionales con un
          enfoque moderno para ofrecer experiencias memorables.
        </motion.p>

        {/* Grid de tarjetas */}
        <motion.div
          variants={gridVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {PHILOSOPHY_CARDS.map((card) => (
            <PhilosophyCardItem key={card.id} card={card} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
