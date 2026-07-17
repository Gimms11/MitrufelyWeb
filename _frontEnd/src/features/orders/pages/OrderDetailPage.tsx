import { useParams, Link } from 'react-router'
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  User,
  CreditCard,
  Receipt,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Package,
  ShoppingBag,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/app/store'

import { useOrderDetailQuery, useConfirmEntregaMutation } from '../hooks/useOrders'

// Helper for formatting date
function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso))
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const saleId = id ? parseInt(id, 10) : null

  const { user } = useAuthStore()

  // Query order detail
  const {
    data: order,
    isLoading,
    isError,
  } = useOrderDetailQuery(saleId)

  // Confirm delivery mutation
  const confirmEntregaMut = useConfirmEntregaMutation()

  const handleConfirmEntrega = () => {
    if (saleId && confirm(`¿Marcar como ENTREGADA la venta #${saleId}?`)) {
      confirmEntregaMut.mutate(saleId)
    }
  }

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager'
  const isEntregaPending = order?.estado === 'PENDIENTE' || order?.estado === 'PAGADO'
  const isNotCancelled = true
  const showEntregaBtn = isAdminOrManager && isEntregaPending && isNotCancelled

  // Document details (receipt type)
  const mainDocument = order?.documentos?.[0]
  const receiptType = mainDocument?.tipo_documento || 'BOLETA'

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf8f5]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#5c0f1b] border-t-transparent" />
          <p className="text-sm font-bold text-[#5c0f1b]">Cargando detalle del pedido...</p>
        </div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-[#faf8f5] p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl border border-red-100 shadow-xl max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Pedido No Encontrado
          </h2>
          <p className="text-sm text-stone-500 font-medium">
            No pudimos recuperar la venta #{id} del servidor o no tienes permisos para verla.
          </p>
          <Link
            to="/orders"
            className="w-full inline-flex items-center justify-center gap-2 bg-[#5c0f1b] hover:bg-[#7a1525] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer border-none"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Pedidos
          </Link>
        </div>
      </div>
    )
  }

  // Calculate taxes on frontend as fallback if they are null on backend
  const calculatedBase = order.base_imponible ?? (order.total / 1.18)
  const calculatedIgv = order.igv ?? (order.total - calculatedBase)

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2a1115] font-sans antialiased pb-12">
      {/* Cabecera */}
      <header className="bg-white border-b border-[#5c0f1b]/10 sticky top-0 z-40 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/orders"
              className="inline-flex items-center justify-center p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black bg-[#ff7a45]/12 border border-[#ff7a45]/20 px-2.5 py-1 rounded-full text-[#ff7a45] uppercase tracking-wide">
                  Detalle del Pedido
                </span>
                <Sparkles className="h-4 w-4 text-[#ff7a45] animate-pulse" />
              </div>
              <h1 className="text-2xl font-black text-[#5c0f1b] tracking-tight mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Pedido #{order.id_venta}
              </h1>
            </div>
          </div>

          {showEntregaBtn && (
            <button
              onClick={handleConfirmEntrega}
              disabled={confirmEntregaMut.isPending}
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-md hover:scale-102 active:scale-95 transition-all border-none cursor-pointer"
            >
              {confirmEntregaMut.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  Marcar Entregada
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Cuerpo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Información de la Compra y Productos */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Resumen del Estado de la Venta */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl border border-[#5c0f1b]/10 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6"
            >
              <div>
                <span className="text-[10px] font-black uppercase text-stone-400 block mb-1">Fecha de Compra</span>
                <div className="flex items-center gap-2 text-[#2a1115] font-extrabold text-sm">
                  <Calendar className="h-4 w-4 text-stone-400" />
                  {formatDateTime(order.fecha_venta)}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-stone-400 block mb-1">Estado Venta</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase border mt-0.5',
                    order.estado === 'PAGADO' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    order.estado === 'PENDIENTE' && 'bg-amber-50 text-amber-700 border-amber-200',
                    order.estado === 'ENTREGADO' && 'bg-purple-50 text-purple-700 border-purple-200',
                    order.estado === 'ANULADO' && 'bg-red-50 text-red-700 border-red-200'
                  )}
                >
                  {order.estado === 'PAGADO' && <CheckCircle2 className="h-3 w-3" />}
                  {order.estado === 'PENDIENTE' && <HelpCircle className="h-3 w-3" />}
                  {order.estado === 'ANULADO' && <AlertCircle className="h-3 w-3" />}
                  {order.estado}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-stone-400 block mb-1">Estado de Pago</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase border mt-0.5',
                    order.estado_pago === 'PAGADO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  )}
                >
                  {order.estado_pago === 'PAGADO' ? 'PAGADO' : 'PENDIENTE'}
                </span>
              </div>
            </motion.div>

            {/* Listado de Productos Comprados */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl border border-[#5c0f1b]/10 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-[#5c0f1b]/8 bg-stone-50/50 flex items-center justify-between">
                <h3 className="font-black text-sm uppercase tracking-wider text-[#5c0f1b] flex items-center gap-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  <Package className="h-4.5 w-4.5" />
                  Productos en este pedido
                </h3>
                <span className="text-xs font-bold text-stone-500 bg-white border px-2.5 py-1 rounded-lg">
                  {order.detalles?.length || 0} ítems
                </span>
              </div>

              <div className="divide-y divide-[#5c0f1b]/6">
                {order.detalles && order.detalles.length > 0 ? (
                  order.detalles.map((item) => (
                    <div key={item.id_detalle} className="p-6 flex items-center gap-4 hover:bg-stone-50/20 transition-colors">
                      {/* Imagen de Producto */}
                      <div className="h-16 w-16 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-2xs shrink-0 flex items-center justify-center">
                        {item.imagen_url || item.imagen_url_producto ? (
                          <img
                            src={item.imagen_url || item.imagen_url_producto || ''}
                            alt={item.nombre || item.nombre_producto || 'Producto'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ShoppingBag className="h-6 w-6 text-[#5c0f1b]/20" />
                        )}
                      </div>

                      {/* Info del Producto */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm text-[#2a1115] truncate">
                          {item.nombre || item.nombre_producto || `Producto #${item.id_producto}`}
                        </h4>
                        <p className="text-xs text-stone-400 font-mono mt-0.5">
                          ID: #{item.id_producto}
                        </p>
                      </div>

                      {/* Desglose de Precios */}
                      <div className="text-right">
                        <span className="text-xs text-stone-500 block font-bold">
                          {item.cantidad} x S/. {Number(item.precio_unitario).toFixed(2)}
                        </span>
                        <span className="font-black text-sm text-[#5c0f1b] block mt-0.5">
                          S/. {Number(item.subtotal).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-stone-400 font-medium">
                    No se cargaron los detalles del producto de forma explícita.
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Columna Derecha: Resumen de Pago y Detalles Fiscales */}
          <div className="space-y-6">
            {/* Información del Cliente */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white p-6 rounded-3xl border border-[#5c0f1b]/10 shadow-sm space-y-4"
            >
              <h3 className="font-black text-xs uppercase tracking-wider text-[#5c0f1b] border-b border-[#5c0f1b]/8 pb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Información Comercial
              </h3>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-black uppercase text-stone-400 block">Cliente</span>
                  <span className="text-sm font-extrabold text-stone-700">Cliente ID #{order.id_cliente}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Receipt className="h-5 w-5 text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-black uppercase text-stone-400 block">Tipo Comprobante</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black bg-[#5c0f1b]/5 text-[#5c0f1b] border border-[#5c0f1b]/10 uppercase mt-0.5">
                    {receiptType}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-black uppercase text-stone-400 block">Método de Pago</span>
                  <span className="text-sm font-extrabold text-stone-700">Tarjeta (Virtual Académico)</span>
                </div>
              </div>
            </motion.div>

            {/* Resumen Fiscal / Totales */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-3xl border border-[#5c0f1b]/10 shadow-sm space-y-4"
            >
              <h3 className="font-black text-xs uppercase tracking-wider text-[#5c0f1b] border-b border-[#5c0f1b]/8 pb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Resumen Fiscal
              </h3>

              <div className="space-y-2 text-sm font-bold text-stone-600">
                <div className="flex justify-between">
                  <span>Base Imponible (IGV Excl.)</span>
                  <span>S/. {Number(calculatedBase).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGV (18%)</span>
                  <span>S/. {Number(calculatedIgv).toFixed(2)}</span>
                </div>
                {order.costo_envio && Number(order.costo_envio) > 0 && (
                  <div className="flex justify-between">
                    <span>Costo Envío</span>
                    <span>S/. {Number(order.costo_envio).toFixed(2)}</span>
                  </div>
                )}
                {order.monto_descuento_cupon && Number(order.monto_descuento_cupon) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Descuento Cupón</span>
                    <span>- S/. {Number(order.monto_descuento_cupon).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-[#5c0f1b]/10 pt-4 flex justify-between items-baseline">
                <span className="text-sm font-black text-[#5c0f1b] uppercase tracking-wider">Total</span>
                <span className="text-2xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  S/. {Number(order.total).toFixed(2)}
                </span>
              </div>

              {/* Badges de Criptotrufas */}
              <div className="bg-[#ff7a45]/8 border border-[#ff7a45]/20 rounded-2xl p-3 text-center">
                <span className="text-[9px] font-black uppercase text-[#ff7a45]/60 block mb-0.5">Criptotrufas a Otorgar</span>
                <span className="text-sm font-black text-[#ff7a45] flex items-center justify-center gap-1">
                  ⭐️ +{order.puntos_ganados} CriptoTrufas
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
