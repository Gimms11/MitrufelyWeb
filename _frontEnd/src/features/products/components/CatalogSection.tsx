/**
 * CatalogSection.tsx — Sección del catálogo de trufas
 *
 * SRP: gestionar el filtrado por tab y renderizar el grid de TrufaCards.
 * Recibe el estado de tabs/búsqueda desde la página padre para mantener
 * la búsqueda del header sincronizada con el filtrado.
 *
 * MEJORAS UI/UX (framer-motion ^12):
 *   - whileInView en el encabezado: entra cuando el usuario llega con el scroll
 *   - stagger en los tabs de categorías
 *   - Separador decorativo animado bajo el título
 */

import { forwardRef, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Link } from 'react-router'
import { TrufaCard } from './TrufaCard'
import { useActiveCategories } from '../hooks/useCategories'
import { useActiveProducts } from '../hooks/useCatalogAdmin'

// ─── Props ────────────────────────────────────────────────────────────────

interface CatalogSectionProps {
  activeTab: string
  onTabChange: (tab: string) => void
  searchQuery: string
}

// ─── Variantes ────────────────────────────────────────────────────────────

const sectionHeader: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

const tabsContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const tabItem: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 18, stiffness: 260 } },
}

// ─── Componente ───────────────────────────────────────────────────────────

export const CatalogSection = forwardRef<HTMLElement, CatalogSectionProps>(
  ({ activeTab, onTabChange, searchQuery }, ref) => {
    // 1. Obtener categorías desde backend
    const { data: categoriesRes, isLoading: categoriesLoading } = useActiveCategories({
      size: 100,
    })
    const categories = categoriesRes?.items || []

    // 2. Seleccionar automáticamente la primera categoría disponible
    useEffect(() => {
      if (categories.length > 0 && !activeTab) {
        const first = categories[0]
        if (first) onTabChange(first.nombre)
      }
    }, [categories, activeTab, onTabChange])

    // 3. Obtener productos asociados a la categoría seleccionada
    const {
      data: productsRes,
      isLoading: productsLoading,
      isPlaceholderData,
    } = useActiveProducts(
      {
        categoria: activeTab || undefined,
        search: searchQuery || undefined,
        size: 4,
      },
      { enabled: !!activeTab },
    )
    const products = productsRes?.items || []
    const displayedProducts = products.slice(0, 4)

    return (
      <section id="catalogo" ref={ref} className="px-4 py-24 scroll-mt-20 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto">
          {/* ── Encabezado con whileInView ── */}
          <motion.div
            variants={sectionHeader}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-14"
          >
            {/* Tabs con stagger — borde iluminado animado */}
            <div className="flex justify-center mb-10">
              {categoriesLoading ? (
                <div className="text-[#5c0f1b]/40 text-xs font-bold py-2 animate-pulse">
                  Cargando categorías…
                </div>
              ) : (
                /* ── Wrapper del borde animado ── */
                <div className="tab-glow-wrapper bg-[#ff7a45] shadow-[0_4px_24px_rgba(255,122,69,0.35)]">
                  <div className="tab-glow-inner bg-[#ff7a45]">
                    <motion.div
                      variants={tabsContainer}
                      initial="hidden"
                      animate="show"
                      className="flex items-center justify-start sm:justify-center p-1.5 gap-2 max-w-full overflow-x-auto whitespace-nowrap scrollbar-none"
                    >
                      {categories.map((cat) => (
                        <motion.button
                          key={cat.id_categoria}
                          variants={tabItem}
                          id={`hp-tab-${cat.id_categoria}`}
                          onClick={() => onTabChange(cat.nombre)}
                          whileHover={{ scale: activeTab !== cat.nombre ? 1.04 : 1 }}
                          whileTap={{ scale: 0.96 }}
                          className={`px-5 py-2.5 rounded-full text-sm font-black tracking-wide transition-colors cursor-pointer border-none shrink-0 ${
                            activeTab === cat.nombre
                              ? 'bg-white text-[#5c0f1b] shadow-md'
                              : 'text-white hover:bg-white/15'
                          }`}
                        >
                          {cat.nombre === 'Trufas Premiun' ? 'Trufas Premium' : cat.nombre}
                        </motion.button>
                      ))}
                    </motion.div>
                  </div>
                </div>
              )}
            </div>

            <h3
              className="font-black text-[#2a1115] mb-3"
              style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2rem, 4.5vw, 3rem)' }}
            >
              Nuestro Catálogo Especial
            </h3>
            <p className="text-[#2a1115]/60 max-w-md mx-auto text-base font-light leading-relaxed">
              Trufas artesanales elaboradas a mano con el cacao más fino y rellenos irresistibles.
            </p>

            {/* Separador decorativo */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="mx-auto mt-5 h-[2px] w-16 rounded-full bg-gradient-to-r from-[#5c0f1b] to-[#ff7a45] origin-center"
            />
          </motion.div>

          {/* ── Grid de productos ── */}
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[350px]"
          >
            <AnimatePresence mode="popLayout">
              {productsLoading || isPlaceholderData ? (
                <div className="col-span-full py-20 text-center flex flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#5c0f1b] border-t-transparent" />
                  <span className="text-[#2a1115]/40 font-semibold text-sm">
                    Cargando delicias…
                  </span>
                </div>
              ) : displayedProducts.length > 0 ? (
                displayedProducts.map((prod) => (
                  <TrufaCard key={prod.id_producto} producto={prod} />
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <p className="text-4xl mb-4">🍫</p>
                  <p className="text-[#2a1115]/45 font-medium text-base">
                    No hay trufas en esta sección aún.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── CTA ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center mt-14"
          >
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block"
            >
              <Link
                id="hp-view-all-btn"
                to={
                  searchQuery.trim()
                    ? `/catalogo?search=${encodeURIComponent(searchQuery.trim())}`
                    : '/catalogo'
                }
                className="inline-flex items-center justify-center px-10 py-3.5 rounded-full bg-[#5c0f1b] text-white text-sm font-black shadow-[0_6px_20px_rgba(92,15,27,0.20)] hover:bg-[#7a1525] transition-colors active:scale-95"
              >
                {searchQuery.trim() ? `Ver resultados de "${searchQuery}"` : 'Ver todo el catálogo'}
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    )
  },
)

CatalogSection.displayName = 'CatalogSection'
