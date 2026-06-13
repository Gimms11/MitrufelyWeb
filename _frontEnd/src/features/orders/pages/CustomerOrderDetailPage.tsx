/**
 * CustomerOrderDetailPage.tsx — Detalle de pedido para el cliente.
 *
 * Ruta: /mi-cuenta/pedidos/:id
 * Consume: GET /api/v1/ventas/{id}
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, ShoppingBag, Clock, Package, Receipt, CreditCard, Coins } from 'lucide-react'

import { useAuthStore } from '@/app/store'
import { PublicHeader } from '@/shared/components/layout/PublicHeader'
import { PublicNav } from '@/shared/components/layout/PublicNav'
import { PublicFooter } from '@/shared/components/layout/PublicFooter'
import { useCartItemCount } from '@/features/cart/hooks/useCart'
import { useOrderDetailQuery } from '@/features/orders/hooks/useOrders'

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  PAGADO: { label: 'Pagado', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  ENTREGADO: { label: 'Entregado', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  ANULADO: { label: 'Anulado', color: 'bg-red-100 text-red-800 border-red-200' },
}

const PAGO_LABELS: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700' },
  PAGADO: { label: 'Pagado', color: 'bg-emerald-50 text-emerald-700' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CustomerOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isAuthenticated, logout } = useAuthStore()
  const cartCount = useCartItemCount()

  const [searchQuery, setSearchQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const orderId = id ? Number(id) : null

  const { data: order, isLoading, isError } = useOrderDetailQuery(orderId)

  const handleSearch = (e: React.FormEvent) => { e.preventDefault() }
  const handleLogout = () => { logout(); setUserMenuOpen(false); toast.success('Sesión cerrada.') }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-[#2a1115] font-sans antialiased">
        <PublicHeader cartCount={cartCount} favoriteCount={0} coinsBalance={null} userName={null}
          userMenuOpen={false} onUserMenuToggle={() => {}} searchQuery="" onSearchChange={() => {}}
          onSearchSubmit={(e) => e.preventDefault()} onLogout={() => {}} />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="h-8 w-8 text-[#5c0f1b] animate-spin" />
          <span className="text-[#2a1115]/50 font-bold text-sm">Cargando pedido...</span>
        </div>
        <PublicFooter />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-[#2a1115] font-sans antialiased">
        <PublicHeader cartCount={cartCount} favoriteCount={0} coinsBalance={null} userName={null}
          userMenuOpen={false} onUserMenuToggle={() => {}} searchQuery="" onSearchChange={() => {}}
          onSearchSubmit={(e) => e.preventDefault()} onLogout={() => {}} />
        <div className="flex flex-col items-center justify-center py-32 gap-6 text-center max-w-md mx-auto">
          <div className="h-16 w-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
            <Package className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="font-black text-[#2a1115] text-xl" style={{ fontFamily: "'Outfit', sans-serif" }}>Pedido no encontrado</h3>
          <Link to="/mi-cuenta/pedidos" className="px-6 py-3 rounded-full bg-[#5c0f1b] text-white font-black text-sm hover:bg-[#7a1525] transition-all">
            Volver a mis pedidos
          </Link>
        </div>
        <PublicFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2a1115] font-sans antialiased">
      <PublicHeader
        cartCount={cartCount} favoriteCount={0}
        coinsBalance={isAuthenticated && user ? user.sweetCoinsBalance : null}
        userName={isAuthenticated && user ? user.name : null}
        userMenuOpen={userMenuOpen} onUserMenuToggle={() => setUserMenuOpen((o) => !o)}
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch} onLogout={handleLogout}
      />
      <main className="max-w-4xl mx-auto px-4 md:px-8 py-10">
        <Link to="/mi-cuenta/pedidos" className="inline-flex items-center gap-2 text-sm font-bold text-[#5c0f1b]/60 hover:text-[#5c0f1b] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Volver a mis pedidos
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-black text-[#2a1115] text-3xl" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Pedido #{order.id_venta}
              </h1>
              {order.fecha_venta && (
                <p className="text-sm text-[#2a1115]/50 font-semibold mt-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {formatDate(order.fecha_venta)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${ESTADO_LABELS[order.estado]?.color || 'bg-stone-100'}`}>
                {ESTADO_LABELS[order.estado]?.label || order.estado}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${PAGO_LABELS[order.estado_pago]?.color || 'bg-stone-50'}`}>
                {PAGO_LABELS[order.estado_pago]?.label || order.estado_pago}
              </span>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Productos */}
            <div className="bg-white rounded-2xl border border-[#5c0f1b]/8 p-5">
              <h3 className="font-black text-[#2a1115] text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#5c0f1b]" />
                Productos
              </h3>
              {order.detalles && order.detalles.length > 0 ? (
                <div className="space-y-3">
                  {order.detalles.map((det) => (
                    <div key={det.id_detalle} className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0">
                      <div className="h-12 w-12 rounded-lg bg-[#f0ede8] overflow-hidden shrink-0 flex items-center justify-center">
                        {(det.imagen_url || det.imagen_url_producto) ? (
                          <img src={(det.imagen_url || det.imagen_url_producto)!} alt={det.nombre_producto || ''} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="h-5 w-5 text-stone-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#2a1115] text-sm truncate">
                          {det.nombre_producto || det.nombre || `Producto #${det.id_producto}`}
                        </p>
                        <p className="text-xs text-[#2a1115]/50 font-semibold">
                          {det.cantidad} × S/. {Number(det.precio_unitario).toFixed(2)}
                        </p>
                      </div>
                      <p className="font-black text-[#5c0f1b] text-sm shrink-0">
                        S/. {Number(det.subtotal).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#2a1115]/40 font-medium text-center py-8">
                  Sin detalles de productos disponibles.
                </p>
              )}
            </div>

            {/* Resumen */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-[#5c0f1b]/8 p-5 space-y-3">
                <h3 className="font-black text-[#2a1115] text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[#5c0f1b]" />
                  Resumen
                </h3>

                {order.subtotal_productos !== undefined && order.subtotal_productos !== null && (
                  <div className="flex justify-between text-sm font-semibold text-[#2a1115]/70">
                    <span>Subtotal</span>
                    <span>S/. {Number(order.subtotal_productos).toFixed(2)}</span>
                  </div>
                )}

                {order.costo_envio !== undefined && order.costo_envio !== null && Number(order.costo_envio) > 0 && (
                  <div className="flex justify-between text-sm font-semibold text-[#2a1115]/70">
                    <span>Envío</span>
                    <span>S/. {Number(order.costo_envio).toFixed(2)}</span>
                  </div>
                )}

                {order.monto_descuento_cupon !== undefined && order.monto_descuento_cupon !== null && Number(order.monto_descuento_cupon) > 0 && (
                  <div className="flex justify-between text-sm font-semibold text-emerald-600">
                    <span>Descuento</span>
                    <span>− S/. {Number(order.monto_descuento_cupon).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-semibold text-[#2a1115]/70">
                  <span>IGV</span>
                  <span>S/. {Number(order.igv ?? (Number(order.total) / 1.18 * 0.18)).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-lg font-black text-[#5c0f1b] border-t border-[#5c0f1b]/10 pt-2 mt-2">
                  <span>Total</span>
                  <span>S/. {Number(order.total).toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#5c0f1b]/8 p-5 space-y-3">
                <h3 className="font-black text-[#2a1115] text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#5c0f1b]" />
                  Pago
                </h3>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-[#2a1115]/60">Método</span>
                  <span className="text-[#2a1115]">
                    {order.metodos_pago?.[0]?.tipo_pago === 'TARJETA' ? 'Tarjeta' : order.metodos_pago?.[0]?.tipo_pago || 'Tarjeta'}
                  </span>
                </div>
                {order.puntos_ganados !== undefined && order.puntos_ganados !== null && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-[#2a1115]/60 flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5 text-[#ff7a45]" />
                      SweetCoins
                    </span>
                    <span className="text-[#ff7a45] font-black">+{order.puntos_ganados}</span>
                  </div>
                )}
              </div>

              {/* Placeholders para futuras fases */}
              <div className="bg-white rounded-2xl border border-dashed border-[#5c0f1b]/15 p-5 space-y-3">
                <h3 className="font-black text-[#2a1115] text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  Documentos
                </h3>
                {order.documentos && order.documentos.length > 0 ? (
                  order.documentos.map((doc) => (
                    <div key={doc.id_documento} className="flex justify-between text-sm font-semibold">
                      <span className="text-[#2a1115]/60">{doc.tipo_documento === 'BOLETA' ? 'Boleta' : doc.tipo_documento}</span>
                      <span className="text-[#2a1115]">{doc.numero_serie || '—'}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#2a1115]/30 font-medium text-center py-4 italic">
                    Comprobante disponible próximamente
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <PublicFooter />
    </div>
  )
}
