/**
 * PackDetailModal.tsx — Modal de detalle de paquete para HomePage.
 *
 * Muestra información del pack, productos que contiene y permite agregar al carrito.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart, Package, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router'
import type { Pack } from '@/features/products/types'
import { useActiveProducts } from '@/features/products/hooks/useCatalogAdmin'
import { useAddCartItem } from '@/features/cart/hooks/useCart'

interface PackDetailModalProps {
  isOpen: boolean
  pack: Pack | null
  onClose: () => void
}

export function PackDetailModal({ isOpen, pack, onClose }: PackDetailModalProps) {
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const addCartItem = useAddCartItem()

  const { data: productsRes } = useActiveProducts(
    { size: 100 },
    { enabled: isOpen && !!pack },
  )
  const allProducts = productsRes?.items || []

  const packProducts = (pack?.productos || []).map((pp) => {
    const product = allProducts.find((p) => p.id_producto === pp.id_producto)
    return {
      ...pp,
      nombre: product?.nombre ?? `Producto #${pp.id_producto}`,
      imagen_url: product?.imagen_url ?? null,
    }
  })

  useEffect(() => {
    if (isOpen) setQuantity(1)
  }, [isOpen, pack?.id_paquete])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleAdd = () => {
    if (!pack) return
    addCartItem.mutate(
      {
        id_producto: pack.id_paquete,
        cantidad: quantity,
        es_paquete: true,
        id_paquete: pack.id_paquete,
      },
      {
        onSuccess: () => {
          toast.success(
            <span>
              {quantity}× <strong>{pack.nombre}</strong> agregado 🛍️{' '}
              <button
                onClick={() => navigate('/carrito')}
                style={{ textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', padding: 0 }}
              >
                Ver carrito
              </button>
            </span>
          )
          onClose()
          setQuantity(1)
        },
      },
    )
  }

  return (
    <AnimatePresence>
      {isOpen && pack && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="bg-white w-full max-w-2xl rounded-[36px] overflow-hidden shadow-2xl relative grid grid-cols-1 md:grid-cols-2  border-[#5c0f1b]/10 max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Cerrar */}
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute top-4 right-4 z-20 p-2 bg-white rounded-full  border-[#5c0f1b]/10 text-[#5c0f1b] hover:text-[#ff7a45] shadow-sm transition-all hover:scale-110 active:scale-90 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Imagen */}
            <div className="relative h-[220px] md:h-full bg-[#f0ede8]">
              {pack.imagen_url ? (
                <img
                  src={pack.imagen_url}
                  alt={pack.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-16 w-16 text-[#5c0f1b]/15" />
                </div>
              )}
              {!pack.disponible && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
                  <div className="bg-stone-800/90 text-white px-5 py-2 rounded-full shadow-lg">
                    <span className="text-sm font-extrabold uppercase tracking-widest">Agotado</span>
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-[#5c0f1b] text-white text-xs font-black px-3 py-1.5 rounded-full shadow-md">
                🎁 Pack
              </div>
            </div>

            {/* Info */}
            <div className="p-6 md:p-8 flex flex-col max-h-[80vh] overflow-y-auto">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-[#ff7a45]/12  border-[#ff7a45]/20 px-3 py-1 rounded-full mb-4 text-xs font-black text-[#ff7a45] uppercase tracking-wide">
                  ✨ Pack Especial
                </div>

                <h3
                  className="font-black text-[#2a1115] text-2xl mb-3"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {pack.nombre}
                </h3>

                {pack.descripcion && (
                  <p className="text-sm text-[#2a1115]/70 font-medium leading-relaxed mb-4">
                    {pack.descripcion}
                  </p>
                )}

                {/* Productos incluidos */}
                <div className="mb-4">
                  <h4 className="text-xs font-black text-[#2a1115]/60 uppercase tracking-wider mb-2">
                    Contiene ({packProducts.length} productos)
                  </h4>
                  <div className="space-y-2">
                    {packProducts.map((pp) => (
                      <div
                        key={pp.id_paquete_producto}
                        className="flex items-center gap-3 bg-stone-50 rounded-xl p-2  border-stone-100"
                      >
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-[#f0ede8] shrink-0 flex items-center justify-center">
                          {pp.imagen_url ? (
                            <img src={pp.imagen_url} alt={pp.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-stone-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#2a1115] truncate">{pp.nombre}</p>
                        </div>
                        <span className="text-xs font-black text-[#5c0f1b] shrink-0">×{pp.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Precio + Cantidad + CTA */}
              <div className="mt-4">
                <div className="flex items-center justify-between gap-4 mb-5 pt-4 border-t border-[#5c0f1b]/8">
                  <span
                    className="text-2xl font-black text-[#5c0f1b]"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    S/. {(Number(pack.precio) * quantity).toFixed(2)}
                  </span>

                  {pack.disponible && (
                    <div className="flex items-center gap-3 bg-[#f4f3f0] border border-[#5c0f1b]/12 rounded-full px-3 py-1.5">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="text-[#5c0f1b] hover:text-[#ff7a45] transition-colors font-bold cursor-pointer"
                        aria-label="Restar"
                      >
                        <span className="block h-4 w-4 text-center leading-4">−</span>
                      </button>
                      <span className="text-base font-black text-[#5c0f1b] w-6 text-center select-none">{quantity}</span>
                      <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className="text-[#5c0f1b] hover:text-[#ff7a45] transition-colors font-bold cursor-pointer"
                        aria-label="Agregar"
                      >
                        <span className="block h-4 w-4 text-center leading-4">+</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAdd}
                  disabled={!pack.disponible || addCartItem.isPending}
                  className={`w-full inline-flex items-center justify-center gap-2 font-black rounded-full py-4 text-sm shadow-lg transition-all active:scale-95 cursor-pointer border-none ${
                    pack.disponible
                      ? 'bg-[#5c0f1b] text-white hover:bg-[#7a1525]'
                      : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {pack.disponible ? 'Agregar al carrito' : 'No disponible'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
