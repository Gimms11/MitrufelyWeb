/**
 * CartView.tsx — Vista principal del Carrito de Compras (SIAM / Mitrufely).
 *
 * Layout replicado de la imagen de referencia:
 *   - Columna izquierda: "Datos Personales" (ahora como sección informativa)
 *   - Columna derecha:   Resumen de compra (items, subtotal, descuento, total)
 *   - Input de cupón
 *   - Botón "Continuar compra" → abre PaymentModal
 *
 * Usa el mismo Layout (PublicHeader / PublicNav / PublicFooter) que CatalogPage.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, Minus, ShoppingBag, Tag, X, ArrowRight, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'

// ── Layout compartido ──────────────────────────────────────────────────────────
import { PublicHeader } from '@/shared/components/layout/PublicHeader'
import { PublicNav }    from '@/shared/components/layout/PublicNav'
import { PublicFooter } from '@/shared/components/layout/PublicFooter'

// ── Store ──────────────────────────────────────────────────────────────────────
import {
  useCartStore,
  selectSubtotal,
  selectTotal,
  selectItemCount,
} from '@/stores/cart.store'
import { useAuthStore } from '@/app/store'

// ── Modal de pago ─────────────────────────────────────────────────────────────
import { PaymentModal } from './PaymentModal'

// ─── Utilidades ───────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  if (!name) return ''
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CartView() {
  const { user, isAuthenticated, logout } = useAuthStore()

  // UI state (idéntico al de CatalogPage)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [userMenuOpen,  setUserMenuOpen]  = useState(false)
  const [paymentOpen,   setPaymentOpen]   = useState(false)
  const [couponInput,   setCouponInput]   = useState('')
  const [couponApplied, setCouponApplied] = useState(false)

  // Store del carrito
  const cartState   = useCartStore()
  const { items, coupon, discount, removeFromCart, updateQuantity, applyCoupon, removeCoupon } = cartState
  const subtotal   = selectSubtotal(cartState)
  const total      = selectTotal(cartState)
  const itemCount  = selectItemCount(cartState)

  // Fondo claro consistente con el catálogo
  useEffect(() => {
    const prevBg    = document.body.style.backgroundColor
    const prevColor = document.body.style.color
    document.body.style.backgroundColor = '#faf8f5'
    document.body.style.color           = '#2a1115'
    return () => {
      document.body.style.backgroundColor = prevBg
      document.body.style.color           = prevColor
    }
  }, [])

  // Sincronizar estado UI con el store
  useEffect(() => {
    setCouponApplied(!!coupon)
    if (coupon) setCouponInput(coupon)
  }, [coupon])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    toast.info(`Buscando: "${searchQuery}"`)
  }

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    toast.success('Sesión cerrada correctamente.')
  }

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) {
      toast.error('Ingresa un código de cupón.')
      return
    }
    const result = applyCoupon(couponInput)
    if (result.success) {
      toast.success(result.message)
      setCouponApplied(true)
    } else {
      toast.error(result.message)
    }
  }

  const handleRemoveCoupon = () => {
    removeCoupon()
    setCouponInput('')
    setCouponApplied(false)
    toast.info('Cupón eliminado.')
  }

  const handleContinue = () => {
    if (items.length === 0) {
      toast.error('Tu carrito está vacío.')
      return
    }
    setPaymentOpen(true)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2a1115] font-sans antialiased overflow-x-hidden">

      {/* ── Header ── */}
      <PublicHeader
        cartCount={itemCount}
        favoriteCount={0}
        coinsBalance={isAuthenticated && user ? user.sweetCoinsBalance : null}
        userName={isAuthenticated && user ? user.name : null}
        userMenuOpen={userMenuOpen}
        onUserMenuToggle={() => setUserMenuOpen((o) => !o)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch}
        onLogout={handleLogout}
      />

      {/* ── Nav ── */}
      <PublicNav />

      {/* ── Cuerpo ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">

        {/* Título */}
        <div className="mb-8">
          <h1
            className="text-2xl font-black text-[#2a1115]"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Carrito{' '}
            <span className="text-[#2a1115]/45 font-semibold text-lg">
              ({itemCount} {itemCount === 1 ? 'producto' : 'productos'})
            </span>
          </h1>
        </div>

        {/* ── Carrito vacío ── */}
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-6"
          >
            <div className="h-28 w-28 rounded-full bg-[#5c0f1b]/6 flex items-center justify-center">
              <ShoppingCart className="h-14 w-14 text-[#5c0f1b]/25" />
            </div>
            <div className="text-center">
              <p
                className="font-black text-[#2a1115] text-xl mb-2"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Tu carrito está vacío
              </p>
              <p className="text-sm text-[#2a1115]/50 font-medium">
                Explora nuestro catálogo y agrega tus trufas favoritas.
              </p>
            </div>
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#5c0f1b] text-white font-black text-sm hover:bg-[#7a1525] transition-all active:scale-95 shadow-md"
            >
              <ShoppingBag className="h-4 w-4" />
              Ir al catálogo
            </Link>
          </motion.div>
        ) : (
          /* ── Layout 2 columnas ── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">

            {/* ──────────────────────────────────────────────────────────────
                COLUMNA IZQUIERDA — Lista de productos + cupón
            ──────────────────────────────────────────────────────────────── */}
            <div className="space-y-4">

              {/* Items */}
              <AnimatePresence initial={false}>
                {items.map(({ product, quantity }) => {
                  const lineTotal = Number(product.precio) * quantity
                  return (
                    <motion.div
                      key={product.id_producto}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25 }}
                      className="bg-white rounded-2xl shadow-md border-[#5c0f1b]/8 p-4 flex items-center gap-4"
                    >
                      {/* Imagen */}
                      <div className="h-30 w-30 rounded-xl overflow-hidden bg-[#f0ede8] shrink-0">
                        {product.imagen_url ? (
                          <img
                            src={product.imagen_url}
                            alt={product.nombre}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="h-10 w-7 text-[#5c0f1b]/20" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-black text-[#2a1115] text-xl line-clamp-1"
                          style={{ fontFamily: "'Outfit', sans-serif" }}
                        >
                          {normalizeName(product.nombre)}
                        </p>
                        <p className="text-l text-[#2a1115]/45 font-semibold mt-0.5">
                          {product.descripcion
                            ? product.descripcion.slice(0, 40) + '…'
                            : 'Trufa Artesanal'}
                        </p>

                        {/* Selector de cantidad */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            id={`cart-minus-${product.id_producto}`}
                            onClick={() => updateQuantity(product.id_producto, quantity - 1)}
                            className="h-6 w-6 rounded-full flex items-center justify-center border border-[#5c0f1b]/20 text-[#5c0f1b] hover:bg-[#5c0f1b]/8 transition-all active:scale-90 cursor-pointer"
                            aria-label="Restar"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-lg font-black text-[#5c0f1b] w-5 text-center select-none">
                            {quantity}
                          </span>
                          <button
                            id={`cart-plus-${product.id_producto}`}
                            onClick={() => updateQuantity(product.id_producto, quantity + 1)}
                            className="h-6 w-6 rounded-full flex items-center justify-center border border-[#5c0f1b]/20 text-[#5c0f1b] hover:bg-[#5c0f1b]/8 transition-all active:scale-90 cursor-pointer"
                            aria-label="Agregar"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Precio + eliminar */}
                      <div className="flex flex-col items-end gap-2">
                        <p className="font-black text-[#5c0f1b] text-base" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          S/ {lineTotal.toFixed(2)}
                        </p>
                        <button
                          id={`cart-remove-${product.id_producto}`}
                          onClick={() => {
                            removeFromCart(product.id_producto)
                            toast.info(`${normalizeName(product.nombre)} eliminado del carrito.`)
                          }}
                          className="p-1.5 rounded-lg border border-[#5c0f1b]/15 text-[#5c0f1b]/50 hover:text-[#5c0f1b] hover:bg-[#5c0f1b]/8 transition-all active:scale-90 cursor-pointer"
                          aria-label={`Eliminar ${product.nombre}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* ── Cupón ── */}
              <div className="bg-white rounded-2xl shadow-md border-[#5c0f1b]/8 p-5 shadow-[0_2px_10px_rgba(42,17,21,0.06)]">
                <p className="text-sm font-black text-[#2a1115] mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[#ff7a45]" />
                  Tengo un cupón de descuento
                </p>

                {couponApplied ? (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <Tag className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="flex-1 text-sm font-black text-emerald-700">
                      {coupon} — Descuento: S/ {discount.toFixed(2)}
                    </span>
                    <button
                      id="cart-remove-coupon"
                      onClick={handleRemoveCoupon}
                      className="text-emerald-500 hover:text-red-500 transition-colors cursor-pointer"
                      aria-label="Eliminar cupón"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <label htmlFor="cart-coupon-input" className="sr-only">
                        Código de cupón
                      </label>
                      <input
                        id="cart-coupon-input"
                        type="text"
                        placeholder="Código de cupón"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        className="w-full rounded-xl border border-[#5c0f1b]/20 px-4 py-2.5 text-sm font-semibold text-[#2a1115] placeholder:text-[#2a1115]/30 focus:outline-none focus:ring-2 focus:ring-[#ff7a45]/40 transition-all bg-white hover:border-[#5c0f1b]/40"
                      />
                    </div>
                    <button
                      id="cart-apply-coupon"
                      onClick={handleApplyCoupon}
                      className="px-5 py-2.5 rounded-xl bg-[#5c0f1b] text-white font-black text-sm hover:bg-[#7a1525] transition-all active:scale-95 cursor-pointer border-none shadow-sm"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-[#2a1115]/35 font-semibold mt-2">
                  Prueba con: <strong>TRUFA20</strong>
                </p>
              </div>

              {/* Volver al catálogo */}
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#5c0f1b]/60 hover:text-[#5c0f1b] transition-colors"
              >
                ← Seguir comprando
              </Link>
            </div>

            {/* ──────────────────────────────────────────────────────────────
                COLUMNA DERECHA — Resumen de compra
            ──────────────────────────────────────────────────────────────── */}
            <div className="lg:sticky lg:top-28 h-fit">
              <div className="bg-white rounded-2xl shadow-md border-[#5c0f1b]/10 shadow-[0_4px_20px_rgba(92,15,27,0.08)] overflow-hidden">

                {/* Header resumen */}
                <div className="px-6 py-5  border-[#5c0f1b]/8">
                  <h2
                    className="font-black text-[#2a1115] text-lg"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Resumen de la compra
                  </h2>
                </div>

                {/* Lista resumida */}
                <div className="px-4 py-4 space-y-3 max-h-72 overflow-y-auto">
                  <AnimatePresence initial={false}>
                    {items.map(({ product, quantity }) => (
                      <motion.div
                        key={product.id_producto}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3"
                      >
                        {/* Miniatura */}
                        <div className="h-20 w-20 rounded-xl overflow-hidden bg-[#f0ede8] shrink-0">
                          {product.imagen_url ? (
                            <img
                              src={product.imagen_url}
                              alt={product.nombre}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="h-6 w-6 text-[#5c0f1b]/20" />
                            </div>
                          )}
                        </div>

                        {/* Info resumida */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-black text-[#2a1115] text-sm line-clamp-1"
                            style={{ fontFamily: "'Outfit', sans-serif" }}
                          >
                            {normalizeName(product.nombre)}
                          </p>
                          <p className="text-xs text-[#2a1115]/45 font-semibold">
                            Trufa Clásica
                          </p>
                          {/* Mini selector de cantidad */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              onClick={() => updateQuantity(product.id_producto, quantity - 1)}
                              className="h-5 w-5 rounded-full flex items-center justify-center border border-[#5c0f1b]/20 text-[#5c0f1b] hover:bg-[#5c0f1b]/8 transition-all active:scale-90 cursor-pointer"
                              aria-label="Restar"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="text-xs font-black text-[#5c0f1b] w-4 text-center select-none">
                              {quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id_producto, quantity + 1)}
                              className="h-5 w-5 rounded-full flex items-center justify-center border border-[#5c0f1b]/20 text-[#5c0f1b] hover:bg-[#5c0f1b]/8 transition-all active:scale-90 cursor-pointer"
                              aria-label="Agregar"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>

                        {/* Precio + eliminar */}
                        <div className="flex flex-col items-end gap-1.5">
                          <p className="font-black text-[#5c0f1b] text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            S/ {(Number(product.precio) * quantity).toFixed(2)}
                          </p>
                          <button
                            onClick={() => removeFromCart(product.id_producto)}
                            className="p-1 rounded-lg border border-[#5c0f1b]/15 text-[#5c0f1b]/40 hover:text-[#5c0f1b] hover:bg-[#5c0f1b]/8 transition-all active:scale-90 cursor-pointer"
                            aria-label={`Eliminar ${product.nombre}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Totales */}
                <div className="px-6 py-5  border-[#5c0f1b]/8 space-y-3">
                  <div className="flex justify-between text-sm font-semibold text-[#2a1115]/70">
                    <span>Productos ({itemCount})</span>
                    <span>S/ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#ff7a45]">
                    <span>Descuentos</span>
                    <span>{discount > 0 ? `S/ ${discount.toFixed(2)}` : 'S/ 0'}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-[#5c0f1b] pt-2 border-t border-[#5c0f1b]/10">
                    <span style={{ fontFamily: "'Outfit', sans-serif" }}>Total</span>
                    <span style={{ fontFamily: "'Outfit', sans-serif" }}>S/ {total.toFixed(2)}</span>
                  </div>

                  <button
                    id="cart-checkout-btn"
                    onClick={handleContinue}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-[#5c0f1b] text-white font-black text-sm hover:bg-[#7a1525] transition-all active:scale-95 shadow-lg cursor-pointer border-none mt-2"
                  >
                    Continuar compra
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <PublicFooter />

      {/* ── Modal de pago ── */}
      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
      />
    </div>
  )
}
