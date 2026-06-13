/**
 * TrufaCard.tsx — Componente de dominio: Tarjeta de producto (trufa)
 *
 * Responsabilidad única (SRP): renderizar una trufa individual en el grid de la Home.
 * Vincula directamente a la vista de detalles del producto.
 */
import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { ShoppingBag } from 'lucide-react'
import type { Producto } from '../types'

// ─── Props ────────────────────────────────────────────────────────────────

interface TrufaCardProps {
  producto: Producto
}

/** Normaliza nombre: primera letra mayúscula, resto minúscula */
function normalizeName(name: string): string {
  if (!name) return ''
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

// ─── Componente ───────────────────────────────────────────────────────────

export function TrufaCard({ producto }: TrufaCardProps) {
  const { nombre, precio, imagen_url, disponible, stock_actual, estado } = producto
  const isAvailable = disponible && estado && stock_actual > 0
  const isLowStock = isAvailable && stock_actual <= 10

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -8, boxShadow: '0px 20px 40px rgba(62, 39, 35, 0.08)' }}
      className="bg-white rounded-[28px] p-4 flex flex-col border-[rgba(62,39,35,0.1)] transition-all duration-300 group"
    >
      {/* Imagen */}
      <div className="relative rounded-[20px] overflow-hidden mb-4 aspect-square bg-[#f0ede8]">
        {imagen_url ? (
          <img
            src={imagen_url}
            alt={nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <ShoppingBag className="h-10 w-10 text-[#5c0f1b]/20" />
            <span className="text-[10px] font-bold text-stone-300 uppercase tracking-wider">
              Sin imagen
            </span>
          </div>
        )}

        {/* Badge: Agotado */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-stone-700/90 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
              Agotado
            </span>
          </div>
        )}

        {/* Badge: Últimas unidades */}
        {isLowStock && (
          <div className="absolute top-3 left-3">
            <span className="bg-[#5c0f1b] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
              ¡Últimas!
            </span>
          </div>
        )}
      </div>

      {/* Detalles */}
      <div className="px-2 pb-2 flex-grow flex flex-col justify-between">
        {/* Nombre + Precio */}
        <div className="flex justify-between items-center mb-4 gap-2">
          <h4
            className="font-black text-[#2a1115] text-lg line-clamp-1 group-hover:text-[#5c0f1b] transition-colors"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {normalizeName(nombre)}
          </h4>
          <p className="text-xl font-black text-[#5c0f1b] shrink-0">
            S/{Number(precio).toFixed(2)}
          </p>
        </div>

        {/* Botón Ver más → navega DIRECTAMENTE a /producto/:slug */}
        <Link
          to={`/producto/${producto.slug}`}
          id={`home-ver-mas-${producto.id_producto}`}
          aria-label={`Ver detalles de ${nombre}`}
          className={`w-full inline-flex items-center justify-center font-black rounded-full py-2.5 text-sm transition-all active:scale-95 ${
            isAvailable
              ? 'bg-[#5c0f1b] text-white hover:bg-[#7a1525]'
              : 'bg-stone-100 text-stone-400 pointer-events-none'
          }`}
          tabIndex={isAvailable ? 0 : -1}
        >
          Ver más
        </Link>
      </div>
    </motion.div>
  )
}

