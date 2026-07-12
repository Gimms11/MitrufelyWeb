import { Link } from 'react-router'
import { Suspense, lazy } from 'react'
import { ArrowLeft, Sparkles, Loader2, DollarSign, Package, AlertTriangle, Star, Clock, Undo2 } from 'lucide-react'
import { useDashboardQuery } from '../hooks/useDashboard'

// Code-split: recharts (~1.1MB) solo se carga cuando hay datos que graficar
const SalesAreaChart = lazy(() =>
  import('../components/DashboardCharts').then((m) => ({ default: m.SalesAreaChart })),
)
const TopProductsBarChart = lazy(() =>
  import('../components/DashboardCharts').then((m) => ({ default: m.TopProductsBarChart })),
)

export default function AdminDashboardPage() {
  const { data: metrics, isLoading, isError } = useDashboardQuery()

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2a1115] font-sans antialiased pb-12">
      {/* Cabecera */}
      <header className="bg-white border-b border-[#5c0f1b]/10 sticky top-0 z-40 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              aria-label="Volver al inicio del dashboard"
              className="inline-flex items-center justify-center p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black bg-[#ff7a45]/12 border border-[#ff7a45]/20 px-2.5 py-1 rounded-full text-[#c44a1a] uppercase tracking-wide">
                  Panel Administrativo
                </span>
                <Sparkles className="h-4 w-4 text-[#ff7a45] animate-pulse" />
              </div>
              <h1 className="text-2xl font-black text-[#5c0f1b] tracking-tight mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Métricas del Negocio
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 text-[#5c0f1b] animate-spin" />
            <p className="text-sm font-bold text-[#2a1115]/50">Cargando métricas...</p>
          </div>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-semibold">
            <span>Error al cargar las métricas. Revisa tu conexión.</span>
          </div>
        )}

        {!isLoading && !isError && metrics && (
          <div className="space-y-6">
            
            {/* Tarjetas Principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#2a1115]/70 uppercase tracking-wider mb-1">Ingresos Totales</p>
                  <p className="text-2xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    S/. {Number(metrics.ventas_totales_monto || 0).toFixed(2)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#2a1115]/70 uppercase tracking-wider mb-1">Total Pedidos</p>
                  <p className="text-2xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {metrics.pedidos_totales}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#2a1115]/70 uppercase tracking-wider mb-1">Ticket Promedio</p>
                  <p className="text-2xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    S/. {Number(metrics.ticket_promedio || 0).toFixed(2)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#2a1115]/70 uppercase tracking-wider mb-1">Tiempo de Entrega</p>
                  <p className="text-2xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {metrics.tiempo_promedio_entrega_minutos ? `${Math.round(metrics.tiempo_promedio_entrega_minutos)} min` : 'N/A'}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Fila secundaria: Calificación, Incidencias, Reembolsos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-yellow-50 flex items-center justify-center">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  </div>
                  <h2 className="font-black text-[#2a1115] text-sm">Satisfacción</h2>
                </div>
                <p className="text-3xl font-black text-[#2a1115] mb-1">
                  {metrics.calificacion_promedio ? Number(metrics.calificacion_promedio).toFixed(1) : 'N/A'} <span className="text-sm text-stone-500">/ 5.0</span>
                </p>
                <p className="text-xs font-bold text-stone-500">{metrics.total_calificaciones} calificaciones totales</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <h2 className="font-black text-[#2a1115] text-sm">Incidencias</h2>
                </div>
                <p className="text-3xl font-black text-red-600 mb-1">{metrics.incidencias_abiertas}</p>
                <p className="text-xs font-bold text-stone-500">tickets abiertos requiriendo atención</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center">
                    <Undo2 className="h-4 w-4 text-rose-500" />
                  </div>
                  <h2 className="font-black text-[#2a1115] text-sm">Reembolsos & Devoluciones</h2>
                </div>
                <p className="text-3xl font-black text-rose-600 mb-1">S/. {Number(metrics.monto_reembolsado || 0).toFixed(2)}</p>
                <p className="text-xs font-bold text-stone-500">
                  {metrics.pedidos_reembolsados} reembolsados, {metrics.pedidos_devueltos} devueltos
                </p>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Ventas por Día */}
              <div className="bg-white p-6 rounded-2xl border border-[#5c0f1b]/10 shadow-sm">
                <h2 className="font-black text-[#2a1115] text-sm uppercase tracking-wider mb-6">
                  Evolución de Ingresos (Últimos 7 días)
                </h2>
                <div className="h-72">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#5c0f1b]" /></div>}>
                    <SalesAreaChart data={metrics.ventas_por_dia} />
                  </Suspense>
                </div>
              </div>

              {/* Productos más vendidos */}
              <div className="bg-white p-6 rounded-2xl border border-[#5c0f1b]/10 shadow-sm">
                <h2 className="font-black text-[#2a1115] text-sm uppercase tracking-wider mb-6">
                  Productos Más Vendidos
                </h2>
                <div className="h-72">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#5c0f1b]" /></div>}>
                    <TopProductsBarChart data={metrics.productos_mas_vendidos} />
                  </Suspense>
                </div>
              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  )
}
