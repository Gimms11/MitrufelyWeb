/**
 * PacksSection.tsx — Sección de packs de regalo de la HomePage
 *
 * Carrusel de PackCards con navegación por flechas y modal de detalle.
 * Muestra máximo 3 packs por página, con transición animada.
 */
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PackCard } from './PackCard'
import { usePackages } from '../hooks/usePackages'

const VISIBLE_PACKS = 3

export function PacksSection() {
  const { data: packs, isLoading, isError } = usePackages()
  const [activeIndex, setActiveIndex] = useState(0)

  const maxIndex = packs ? Math.max(0, packs.length - VISIBLE_PACKS) : 0
  const visiblePacks = packs?.slice(activeIndex, activeIndex + VISIBLE_PACKS) ?? []

  const canGoLeft = activeIndex > 0
  const canGoRight = activeIndex < maxIndex
  const showArrows = visiblePacks.length > 0 && packs && packs.length > VISIBLE_PACKS

  const goLeft = () => setActiveIndex((i) => Math.max(0, i - 1))
  const goRight = () => setActiveIndex((i) => Math.min(maxIndex, i + 1))

  return (
    <section
      id="puntos"
      className="bg-white py-24 px-4 scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <span className="inline-block bg-[#5c0f1b]/8 text-[#5c0f1b] text-[10px] font-black uppercase tracking-[0.18em] px-4 py-1.5 rounded-full mb-4  border-[#5c0f1b]/10">
            Packs Especiales
          </span>
          <h3
            className="font-black text-[#2a1115] mb-3"
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2rem, 4.5vw, 3rem)' }}
          >
            Packs para compartir{' '}
            <span className="text-[#5c0f1b]">(o para ti solo)</span>
          </h3>
          <p className="text-[#2a1115]/60 max-w-md mx-auto text-base font-light leading-relaxed">
            Nuestras cajas surtidas más exclusivas, diseñadas para regalar, estudiar o disfrutar.
          </p>
          {/* Separador decorativo */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="mx-auto mt-5 h-[2px] w-14 rounded-full bg-gradient-to-r from-[#5c0f1b] to-[#ff7a45] origin-center"
          />
        </motion.div>

        <div className="relative max-w-6xl mx-auto">
          {showArrows && (
            <button
              aria-label="Pack anterior"
              onClick={goLeft}
              disabled={!canGoLeft}
              className="hidden lg:flex absolute -left-12 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-[#ff7a45] text-white items-center justify-center shadow-lg hover:bg-[#e86a35] transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer border-none"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 min-h-[400px]">
            {isLoading && (
              <div className="col-span-full flex justify-center items-center">
                <span className="text-[#5c0f1b] font-bold">Cargando paquetes especiales...</span>
              </div>
            )}

            {isError && (
              <div className="col-span-full flex justify-center items-center">
                <span className="text-red-600 font-bold">Ocurrió un error al cargar los paquetes.</span>
              </div>
            )}

            {!isLoading && !isError && visiblePacks.length === 0 && (
              <div className="col-span-full flex justify-center items-center">
                <span className="text-gray-500 font-medium">Por el momento no hay paquetes disponibles.</span>
              </div>
            )}

            {!isLoading && !isError && (
              <AnimatePresence mode="popLayout">
                {visiblePacks.map((pack) => (
                  <motion.div
                    key={pack.id_paquete}
                    layout
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PackCard pack={pack} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {showArrows && (
            <button
              aria-label="Siguiente pack"
              onClick={goRight}
              disabled={!canGoRight}
              className="hidden lg:flex absolute -right-12 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-[#ff7a45] text-white items-center justify-center shadow-lg hover:bg-[#e86a35] transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer border-none"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
