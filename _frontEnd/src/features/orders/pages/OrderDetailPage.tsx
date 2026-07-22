import { useState } from 'react'
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
  Loader2,
  Truck,
  Undo2,
  RotateCcw,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/app/store'

import { useOrderDetailQuery, useTransitionVentaMutation } from '../hooks/useOrders'
import { OrderTrackingTimeline } from '../components/OrderTrackingTimeline'

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

  // Estado para el modal de confirmación personalizado (con captura de motivo)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    id: number | null
    action: string | null
    motivo: string
    monto: string
    error: string | null
  }>({
    isOpen: false,
    id: null,
    action: null,
    motivo: '',
    monto: '',
    error: null,
  })

  // Query order detail
  const {
    data: order,
    isLoading,
    isError,
  } = useOrderDetailQuery(saleId)

  // Mutation for state transitions (M14 FSM)
  const transitionMut = useTransitionVentaMutation()

  const ACCIONES_CON_MOTIVO = new Set(['cancelar', 'devolver', 'reembolsar'])
  const ACCIONES_CON_MONTO = new Set(['reembolsar'])

  const handleTransition = (action: string) => {
    if (!saleId) return
    setConfirmModal({ isOpen: true, id: saleId, action, motivo: '', monto: '', error: null })
  }

  const confirmTransition = () => {
    if (!confirmModal.id || !confirmModal.action) return
    const action = confirmModal.action

    if (ACCIONES_CON_MOTIVO.has(action)) {
      if (confirmModal.motivo.trim().length < 5) {
        setConfirmModal({ ...confirmModal, error: 'El motivo debe tener al menos 5 caracteres.' })
        return
      }
    }
    if (ACCIONES_CON_MONTO.has(action)) {
      const montoNum = Number(confirmModal.monto)
      if (!confirmModal.monto || isNaN(montoNum) || montoNum <= 0) {
        setConfirmModal({ ...confirmModal, error: 'Ingresa un monto válido mayor a 0.' })
        return
      }

      if (order) {
        const limite = order.total_final ?? order.total
        if (montoNum > Number(limite)) {
          setConfirmModal({
            ...confirmModal,
            error: `El monto de reembolso no puede superar el total del pedido (S/. ${Number(limite).toFixed(2)}).`,
          })
          return
        }
      }
    }

    const payload: { motivo?: string; observaciones?: string; monto?: number } = {}
    if (ACCIONES_CON_MOTIVO.has(action)) {
      payload.motivo = confirmModal.motivo.trim()
    }
    if (ACCIONES_CON_MONTO.has(action)) {
      payload.monto = Number(confirmModal.monto)
    }

    transitionMut.mutate(
      { id: confirmModal.id, action, payload },
      {
        onSuccess: () => closeConfirmModal(),
        onError: (error: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = error as any
          const customMsg = e?.response?.data?.error?.message
          const detail = e?.response?.data?.detail
          let msg = 'No se pudo procesar la transición.'
          if (customMsg) msg = customMsg
          else if (Array.isArray(detail)) msg = detail.map((err: any) => err.msg || err).join(', ')
          else if (typeof detail === 'string') msg = detail
          setConfirmModal((prev) => ({ ...prev, error: msg }))
        },
      },
    )
  }

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, id: null, action: null, motivo: '', monto: '', error: null })
  }

  const canManageOrders = user && (user.role === 'admin' || user.role === 'manager' || user.role === 'cashier')

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

          {/* Botones de acción FSM */}
          {canManageOrders && (
            <div className="flex flex-wrap items-center gap-2">
              {order.estado === 'PENDIENTE' && (
                <>
                  <button
                    onClick={() => handleTransition('pagar')}
                    disabled={transitionMut.isPending}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:scale-102 active:scale-95 transition-all border-none cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Marcar Pagado
                  </button>
                  <button
                    onClick={() => handleTransition('cancelar')}
                    disabled={transitionMut.isPending}
                    className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl text-xs font-black shadow-2xs hover:scale-102 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <AlertCircle className="h-4 w-4" /> Cancelar Pedido
                  </button>
                </>
              )}

              {order.estado === 'PAGADO' && (
                <>
                  <button
                    onClick={() => handleTransition('preparar')}
                    disabled={transitionMut.isPending}
                    className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:scale-102 active:scale-95 transition-all border-none cursor-pointer disabled:opacity-50"
                  >
                    <Package className="h-4 w-4" /> Iniciar Preparación
                  </button>
                  <button
                    onClick={() => handleTransition('cancelar')}
                    disabled={transitionMut.isPending}
                    className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl text-xs font-black shadow-2xs hover:scale-102 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <AlertCircle className="h-4 w-4" /> Cancelar Pedido
                  </button>
                </>
              )}

              {order.estado === 'PREPARANDO' && (
                <>
                  <button
                    onClick={() => handleTransition('despachar')}
                    disabled={transitionMut.isPending}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:scale-102 active:scale-95 transition-all border-none cursor-pointer disabled:opacity-50"
                  >
                    <Truck className="h-4 w-4" /> Despachar Pedido
                  </button>
                  <button
                    onClick={() => handleTransition('cancelar')}
                    disabled={transitionMut.isPending}
                    className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl text-xs font-black shadow-2xs hover:scale-102 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <AlertCircle className="h-4 w-4" /> Cancelar Pedido
                  </button>
                </>
              )}

              {order.estado === 'EN_CAMINO' && (
                <>
                  <button
                    onClick={() => handleTransition('entregar')}
                    disabled={transitionMut.isPending}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:scale-102 active:scale-95 transition-all border-none cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Marcar Entregado
                  </button>
                  <button
                    onClick={() => handleTransition('devolver')}
                    disabled={transitionMut.isPending}
                    className="inline-flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 rounded-xl text-xs font-black shadow-2xs hover:scale-102 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Undo2 className="h-4 w-4" /> Devolver (retorna)
                  </button>
                </>
              )}

              {order.estado === 'ENTREGADO' && (
                <>
                  <button
                    onClick={() => handleTransition('devolver')}
                    disabled={transitionMut.isPending}
                    className="inline-flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 rounded-xl text-xs font-black shadow-2xs hover:scale-102 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Undo2 className="h-4 w-4" /> Registrar Devolución
                  </button>
                  <button
                    onClick={() => handleTransition('reembolsar')}
                    disabled={transitionMut.isPending}
                    className="inline-flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-4 py-2 rounded-xl text-xs font-black shadow-2xs hover:scale-102 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" /> Procesar Reembolso
                  </button>
                </>
              )}

              {(order.estado === 'CANCELADO' || order.estado === 'DEVUELTO') && (
                <button
                  onClick={() => handleTransition('reembolsar')}
                  disabled={transitionMut.isPending}
                  className="inline-flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-4 py-2 rounded-xl text-xs font-black shadow-2xs hover:scale-102 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" /> Procesar Reembolso
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Cuerpo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Información de la Compra, Línea de Tiempo y Productos */}
          <div className="lg:col-span-2 space-y-6">

            {/* Timeline M14 si existen eventos */}
            {order.order_events && order.order_events.length > 0 && (
              <OrderTrackingTimeline 
                events={order.order_events} 
                currentState={order.estado} 
                pct={order.progreso_pct ?? 0} 
              />
            )}
            
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
                    order.estado === 'PREPARANDO' && 'bg-orange-50 text-orange-700 border-orange-200',
                    order.estado === 'EN_CAMINO' && 'bg-blue-50 text-blue-700 border-blue-200',
                    order.estado === 'ENTREGADO' && 'bg-purple-50 text-purple-700 border-purple-200',
                    order.estado === 'CANCELADO' && 'bg-stone-100 text-stone-700 border-stone-300',
                    order.estado === 'DEVUELTO' && 'bg-rose-50 text-rose-700 border-rose-200',
                    order.estado === 'REEMBOLSADO' && 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
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
                  {order.estado_pago === 'PAGADO' ? 'PAGADO' : order.estado_pago}
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
                  <span className="text-sm font-extrabold text-stone-700">
                    {order.cliente_nombre ? order.cliente_nombre : `Cliente ID #${order.id_cliente}`}
                  </span>
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
                  <span className="text-sm font-extrabold text-stone-700">
                    {order.metodos_pago?.[0]?.tipo_pago || 'Tarjeta (Virtual Académico)'}
                  </span>
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

      {/* Modal de Confirmación Custom (con captura de motivo / monto) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-[#5c0f1b]/10 animate-in fade-in zoom-in duration-200">
            <h3
              className="text-lg font-black text-[#5c0f1b] mb-2"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {confirmModal.action === 'pagar' && 'Marcar pedido como Pagado'}
              {confirmModal.action === 'preparar' && 'Iniciar preparación del pedido'}
              {confirmModal.action === 'despachar' && 'Despachar pedido (En camino)'}
              {confirmModal.action === 'entregar' && 'Marcar pedido como Entregado'}
              {confirmModal.action === 'cancelar' && 'Cancelar pedido'}
              {confirmModal.action === 'devolver' && 'Registrar devolución'}
              {confirmModal.action === 'reembolsar' && 'Procesar reembolso'}
              {!['pagar', 'preparar', 'despachar', 'entregar', 'cancelar', 'devolver', 'reembolsar'].includes(confirmModal.action ?? '') && 'Confirmar acción'}
            </h3>
            <p className="text-sm text-stone-600 mb-4">
              Venta <strong>#{confirmModal.id}</strong> —{' '}
              <span className="capitalize">{confirmModal.action}</span>.
              {ACCIONES_CON_MOTIVO.has(confirmModal.action ?? '') &&
                ' Esta acción reintegra el stock y queda registrada en el historial.'}
            </p>

            {/* Campos dinámicos según la acción */}
            {ACCIONES_CON_MONTO.has(confirmModal.action ?? '') && (
              <div className="mb-3">
                <label className="block text-xs font-black uppercase tracking-wide text-stone-500 mb-1">
                  Monto a reembolsar (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={confirmModal.monto}
                  onChange={(e) =>
                    setConfirmModal({ ...confirmModal, monto: e.target.value, error: null })
                  }
                  placeholder="Ej: 50.00"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-[#faf8f5] text-sm font-semibold text-[#2a1115] outline-none focus:border-[#5c0f1b]"
                  disabled={transitionMut.isPending}
                />
              </div>
            )}

            {ACCIONES_CON_MOTIVO.has(confirmModal.action ?? '') && (
              <div className="mb-3">
                <label className="block text-xs font-black uppercase tracking-wide text-stone-500 mb-1">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={confirmModal.motivo}
                  onChange={(e) =>
                    setConfirmModal({ ...confirmModal, motivo: e.target.value, error: null })
                  }
                  placeholder="Describe el motivo (mínimo 5 caracteres)..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-[#faf8f5] text-sm font-semibold text-[#2a1115] outline-none focus:border-[#5c0f1b] resize-none"
                  disabled={transitionMut.isPending}
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  {confirmModal.motivo.trim().length}/5 mínimo
                </p>
              </div>
            )}

            {/* Error inline (no cierra el modal para permitir reintentar) */}
            {confirmModal.error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{confirmModal.error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeConfirmModal}
                disabled={transitionMut.isPending}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={confirmTransition}
                disabled={transitionMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-[#5c0f1b] text-white font-bold text-sm hover:bg-[#7a1525] transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {transitionMut.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Sí, aplicar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
