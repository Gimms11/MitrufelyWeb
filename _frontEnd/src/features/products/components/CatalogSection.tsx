/**
 * CatalogSection.tsx — Sección del catálogo de trufas
 *
 * SRP: gestionar el filtrado por tab y renderizar el grid de TrufaCards.
 * Recibe el estado de tabs/búsqueda desde la página padre para mantener
 * la búsqueda del header sincronizada con el filtrado.
 */
import { forwardRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    const { data: productsRes, isLoading: productsLoading } = useActiveProducts(
      {
        categoria: activeTab || undefined,
        search: searchQuery || undefined,
        size: 8, // Limitar a un máximo de 8 desde el backend
      },
      {
        enabled: !!activeTab,
      }
    )
    const products = productsRes?.items || []

    // Limitar de forma segura en cliente a un máximo de 8 productos
    const displayedProducts = products.slice(0, 8)

    return (
      <section
        id="catalogo"
        ref={ref}
        className="px-4 py-16 scroll-mt-20 bg-[#faf8f5]"
      >
        <div className="max-w-7xl mx-auto">

          {/* Encabezado */}
          <div className="text-center mb-12">
            {/* Tabs dinámicos */}
            <div className="flex justify-center mb-8">
              {categoriesLoading ? (
                <div className="text-[#5c0f1b]/50 text-xs font-bold py-2">
                  Cargando categorías...
                </div>
              ) : (
                <div className="flex flex-wrap justify-center bg-[#ff7a45] p-1.5 rounded-[24px] md:rounded-full shadow-lg gap-1 max-w-full">
                  {categories.map((cat) => (
                    <button
                      key={cat.id_categoria}
                      id={`hp-tab-${cat.id_categoria}`}
                      onClick={() => onTabChange(cat.nombre)}
                      className={`px-5 py-2.5 rounded-full text-sm font-black tracking-wide transition-all cursor-pointer border-none ${
                        activeTab === cat.nombre
                          ? 'bg-white text-[#5c0f1b] shadow-md'
                          : 'text-white hover:bg-white/15'
                      }`}
                    >
                      {cat.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <h3
              className="font-black text-[#2a1115] mb-3"
              style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}
            >
              Nuestro Catálogo Especial
            </h3>
            <p className="text-[#2a1115]/55 max-w-md mx-auto text-sm font-medium">
              Trufas artesanales elaboradas a mano con el cacao más fino y rellenos irresistibles.
            </p>
          </div>

          {/* Grid de productos */}
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[350px]"
          >
            <AnimatePresence mode="popLayout">
              {productsLoading ? (
                <div className="col-span-full py-20 text-center flex flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#5c0f1b] border-t-transparent" />
                  <span className="text-[#2a1115]/50 font-bold text-sm">Cargando delicias...</span>
                </div>
              ) : displayedProducts.length > 0 ? (
                displayedProducts.map((prod) => (
                  <TrufaCard
                    key={prod.id_producto}
                    producto={prod}
                  />
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <p className="text-4xl mb-4">🍫</p>
                  <p className="text-[#2a1115]/50 font-semibold text-base">
                    No hay trufas en esta sección aún.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* CTA ver todo — navega al Catálogo Público (/catalogo) */}
          <div className="text-center mt-12">
            <Link
              id="hp-view-all-btn"
              to="/catalogo"
              className="inline-flex items-center justify-center px-10 py-3.5 rounded-full bg-[#5c0f1b] text-white text-sm font-black shadow-lg hover:bg-[#7a1525] transition-all hover:scale-105 active:scale-95"
            >
              Ver todo el catálogo
            </Link>
          </div>
        </div>
      </section>
    )
  },
)

CatalogSection.displayName = 'CatalogSection'
