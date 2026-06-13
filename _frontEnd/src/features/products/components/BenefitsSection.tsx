/**
 * BenefitsSection.tsx — Sección de beneficios de la HomePage
 *
 * SRP: renderizar las 2 tarjetas de beneficios (CriptoTrufas + Personalización).
 * Puramente presentacional — sin estado propio.
 *
 * MEJORAS UI/UX (framer-motion ^12):
 *   - whileInView en cada tarjeta (stagger 0.12 s entre ellas)
 *   - whileHover con sombra muy difuminada y elevación sutil (sin shadow estática dura)
 *   - Imagen interna con scale en hover via group
 *   - Separador animado bajo el título de sección
 *   - Bordes sutiles 1 px reemplazan el relleno gris sólido pesado
 */

import { toast } from 'sonner'
import { motion, type Variants } from 'framer-motion'

// ─── Variantes ────────────────────────────────────────────────────────────

const sectionTitle: Variants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 36 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

// ─── Datos de las tarjetas ─────────────────────────────────────────────────

const BENEFIT_CARDS = [
  {
    id:          'hp-criptotrufa-btn',
    label:       'Beneficios',
    title:       'CriptoTrufas',
    description: <>Gana Puntos y obtén<br />descuentos exclusivos</>,
    cta:         'Obtener',
    imgSrc:      '/fbb5dddd-a58d-47d8-bf65-20709c212286.png',
    imgAlt:      'CriptoTrufas',
    imgFallback: '/fbb5dddd-a58d-47d8-bf65-20709c212286.png',
    onCta:       () => toast.info('Club CriptoTrufas próximamente activo.'),
  },
  {
    id:          'hp-personalizacion-btn',
    label:       'Personalización',
    title:       'Tu trufa perfecta',
    description: <>Personaliza para una<br />ocasión especial</>,
    cta:         'Contáctanos',
    imgSrc:      '/fbb5dddd-a58d-47d8-bf65-20709c212286 (1).png',
    imgAlt:      'Personalización',
    imgFallback: '/fbb5dddd-a58d-47d8-bf65-20709c212286 (1).png',
    onCta:       () => toast.info('Formulario de personalización en desarrollo.'),
  },
] as const

// ─── Componente ───────────────────────────────────────────────────────────

export function BenefitsSection() {
  return (
    <section className="py-24 px-4 bg-[#faf8f5]">
      <div className="max-w-7xl mx-auto">

        {/* Encabezado con whileInView */}
        <motion.div
          variants={sectionTitle}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="text-center mb-14"
        >
          <h3
            className="font-black text-[#2a1115]"
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2rem, 4.5vw, 3rem)' }}
          >
            Más razones para elegir <span className="text-[#5c0f1b]">Mitrufely</span>
          </h3>
          <p className="text-[#2a1115]/60 font-light text-base mt-4 max-w-md mx-auto leading-relaxed">
            Calidad artesanal, fidelización real y experiencias a medida.
          </p>

          {/* Separador decorativo */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="mx-auto mt-5 h-[2px] w-14 rounded-full bg-gradient-to-r from-[#5c0f1b] to-[#ff7a45] origin-center"
          />
        </motion.div>

        {/* Grid de tarjetas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {BENEFIT_CARDS.map((card, i) => (
            <motion.div
              key={card.id}
              variants={cardVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: i * 0.12 }}
              whileHover={{
                y: -8,
                boxShadow: '0px 20px 40px rgba(62, 39, 35, 0.08)',
              }}
              className="relative overflow-hidden rounded-[28px]  bg-gradient-to-br from-[#f4f1ec] via-[#ede8e0] to-[#e2d9cc] min-h-[280px] flex group cursor-default transition-shadow"
              style={{ boxShadow: '0 2px 12px rgba(92,15,27,0.05)' }}
            >
              {/* Contenido textual */}
              <div className="relative z-10 flex flex-col justify-center p-9 w-[62%] sm:w-[58%]">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5c0f1b]/50 mb-2">
                  {card.label}
                </p>
                <h4
                  className="font-black text-[#5c0f1b] text-4xl md:text-[2.6rem] mb-4 leading-[1.05] tracking-tight"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {card.title}
                </h4>
                <p className="text-[15px] text-[#2a1115]/65 font-light mb-7 leading-relaxed pr-4">
                  {card.description}
                </p>
                <motion.button
                  id={card.id}
                  onClick={card.onCta}
                  whileHover={{
                    scale: 1.04,
                    boxShadow: '0 8px 22px rgba(255,122,69,0.30)',
                  }}
                  whileTap={{ scale: 0.96 }}
                  className="bg-[#ff7a45] hover:bg-[#e8682e] text-white font-black py-2.5 px-8 rounded-full w-max shadow-[0_4px_14px_rgba(255,122,69,0.20)] transition-colors cursor-pointer border-none text-sm"
                >
                  {card.cta}
                </motion.button>
              </div>

              {/* Imagen decorativa */}
              <div className="absolute right-[-40%] bottom-[-17%] w-[128%] h-[125%] pointer-events-none">
                <img
                  src={card.imgSrc}
                  alt={card.imgAlt}
                  className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform duration-500 ease-out group-hover:scale-[1.07]"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = card.imgFallback
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
