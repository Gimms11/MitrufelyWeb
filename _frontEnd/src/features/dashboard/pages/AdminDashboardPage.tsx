import { useState, Suspense, lazy } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  DollarSign,
  Package,
  AlertTriangle,
  Star,
  Clock,
  Undo2,
  Calendar,
  Filter,
  ArrowUpRight,
  TrendingUp,
  BarChart3,
  CheckCircle,
} from 'lucide-react'
import { useDashboardQuery } from '../hooks/useDashboard'

// Code-split: recharts (~1.1MB) solo se carga cuando hay datos que graficar
const SalesAreaChart = lazy(() =>
  import('../components/DashboardCharts').then((m) => ({ default: m.SalesAreaChart })),
)
const TopProductsBarChart = lazy(() =>
  import('../components/DashboardCharts').then((m) => ({ default: m.TopProductsBarChart })),
)

export default function AdminDashboardPage() {
  const [dias, setDias] = useState<number>(30)
  const [topLimit, setTopLimit] = useState<number>(10)

  const { data: metrics, isLoading, isError } = useDashboardQuery(dias)

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2a1115] font-sans antialiased pb-12">
      {/* Cabecera */}
      <header className="bg-white border-b border-[#5c0f1b]/10 sticky top-0 z-40 backdrop-blur-md bg-white/95 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/orders"
              aria-label="Ir al gestor de pedidos"
              className="inline-flex items-center justify-center p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black bg-[#ff7a45]/12 border border-[#ff7a45]/20 px-2.5 py-0.5 rounded-full text-[#c44a1a] uppercase tracking-wide">
                  Panel Administrativo
                </span>
                <Sparkles className="h-4 w-4 text-[#ff7a45] animate-pulse" />
              </div>
              <h1 className="text-2xl font-black text-[#5c0f1b] tracking-tight mt-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Métricas Inteligentes del Negocio
              </h1>
            </div>
          </div>

          {/* Selector de Rango de Días de Análisis */}
          <div className="flex items-center gap-2 bg-[#faf8f5] p-1.5 rounded-2xl border border-[#5c0f1b]/10 self-stretch sm:self-auto justify-end">
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-[#5c0f1b] uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5 text-[#ff7a45]" /> Periodo:
            </div>
            {[7, 14, 30, 60, 90].map((num) => (
              <button
                key={num}
                onClick={() => setDias(num)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  dias === num
                    ? 'bg-[#5c0f1b] text-white shadow-sm scale-105'
                    : 'text-stone-600 hover:bg-white hover:text-[#5c0f1b]'
                }`}
              >
                {num}d
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 text-[#5c0f1b] animate-spin" />
            <p className="text-sm font-bold text-[#2a1115]/50">Calculando métricas actualizadas...</p>
          </div>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-semibold">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>Error al cargar las métricas. Revisa la conexión con el servidor.</span>
          </div>
        )}

        {!isLoading && !isError && metrics && (
          <div className="space-y-6">
            
            {/* Barra de Accesos Rápidos Operativos */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 px-5 rounded-2xl border border-[#5c0f1b]/10 shadow-2xs">
              <span className="text-xs font-black uppercase text-[#5c0f1b] tracking-wider flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-[#ff7a45]" /> Enlaces Rápidos de Gestión:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/orders"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#5c0f1b] bg-[#5c0f1b]/5 hover:bg-[#5c0f1b]/10 px-3 py-1.5 rounded-xl transition-all"
                >
                  Gestor de Pedidos <ArrowUpRight className="h-3 w-3" />
                </Link>
                <Link
                  to="/inventory"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#5c0f1b] bg-[#5c0f1b]/5 hover:bg-[#5c0f1b]/10 px-3 py-1.5 rounded-xl transition-all"
                >
                  Kardex e Inventario <ArrowUpRight className="h-3 w-3" />
                </Link>
                <Link
                  to="/reports"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#5c0f1b] bg-[#5c0f1b]/5 hover:bg-[#5c0f1b]/10 px-3 py-1.5 rounded-xl transition-all"
                >
                  Reportes Avanzados <ArrowUpRight className="h-3 w-3" />
                </Link>
                <Link
                  to="/dashboard/atencion-cliente/incidencias"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all"
                >
                  Incidencias ({metrics.incidencias_abiertas}) <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Tarjetas Principales KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-2xs hover:shadow-md transition-all flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#2a1115]/70 uppercase tracking-wider mb-1">Ingresos Totales</p>
                  <p className="text-2xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    S/. {Number(metrics.ventas_totales_monto || 0).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-extrabold mt-1 block">
                    Ventas Netas Validadas
                  </span>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-2xs hover:shadow-md transition-all flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#2a1115]/70 uppercase tracking-wider mb-1">Total Pedidos</p>
                  <p className="text-2xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {metrics.pedidos_totales}
                  </p>
                  <span className="text-[10px] text-blue-600 font-extrabold mt-1 block">
                    {metrics.pedidos_entregados} entregados exitosamente
                  </span>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-2xs hover:shadow-md transition-all flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#2a1115]/70 uppercase tracking-wider mb-1">Ticket Promedio</p>
                  <p className="text-2xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    S/. {Number(metrics.ticket_promedio || 0).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-amber-600 font-extrabold mt-1 block">
                    Promedio por transacción
                  </span>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-2xs hover:shadow-md transition-all flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#2a1115]/70 uppercase tracking-wider mb-1">Tiempo de Entrega</p>
                  <p className="text-2xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {metrics.tiempo_promedio_entrega_minutos ? `${Math.round(metrics.tiempo_promedio_entrega_minutos)} min` : 'N/A'}
                  </p>
                  <span className="text-[10px] text-purple-600 font-extrabold mt-1 block">
                    Promedio despacho a entrega
                  </span>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Fila Secundaria: Calificación, Incidencias, Reembolsos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-2xs">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-full bg-yellow-50 flex items-center justify-center">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  </div>
                  <h2 className="font-black text-[#2a1115] text-sm uppercase tracking-wider">Satisfacción Cliente</h2>
                </div>
                <p className="text-3xl font-black text-[#2a1115] mb-1">
                  {metrics.calificacion_promedio ? Number(metrics.calificacion_promedio).toFixed(1) : '5.0'}{' '}
                  <span className="text-sm text-stone-400 font-normal">/ 5.0</span>
                </p>
                <p className="text-xs font-bold text-stone-500">{metrics.total_calificaciones} valoraciones registradas</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-2xs">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <h2 className="font-black text-[#2a1115] text-sm uppercase tracking-wider">Incidencias Operativas</h2>
                </div>
                <p className="text-3xl font-black text-red-600 mb-1">{metrics.incidencias_abiertas}</p>
                <p className="text-xs font-bold text-stone-500">casos pendientes de solución</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#5c0f1b]/10 shadow-2xs">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center">
                    <Undo2 className="h-4 w-4 text-rose-500" />
                  </div>
                  <h2 className="font-black text-[#2a1115] text-sm uppercase tracking-wider">Reembolsos & Devoluciones</h2>
                </div>
                <p className="text-3xl font-black text-rose-600 mb-1">S/. {Number(metrics.monto_reembolsado || 0).toFixed(2)}</p>
                <p className="text-xs font-bold text-stone-500">
                  {metrics.pedidos_reembolsados} reembolsados, {metrics.pedidos_devueltos} devueltos
                </p>
              </div>
            </div>

            {/* Gráficos Principales Reactivos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Gráfico 1: Evolución de Ingresos */}
              <div className="bg-white p-6 rounded-3xl border border-[#5c0f1b]/10 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-[#5c0f1b] text-sm uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    <TrendingUp className="h-4.5 w-4.5 text-[#ff7a45]" />
                    Evolución de Ingresos (Últimos {dias} días)
                  </h2>
                </div>
                <div className="w-full min-h-[300px] flex-1">
                  <Suspense fallback={<div className="h-full flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#5c0f1b]" /></div>}>
                    <SalesAreaChart data={metrics.ventas_por_dia} />
                  </Suspense>
                </div>
              </div>

              {/* Gráfico 2: Productos Más Vendidos */}
              <div className="bg-white p-6 rounded-3xl border border-[#5c0f1b]/10 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="font-black text-[#5c0f1b] text-sm uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    <BarChart3 className="h-4.5 w-4.5 text-[#ff7a45]" />
                    Top Productos Más Vendidos
                  </h2>
                  <div className="flex items-center gap-1 bg-[#faf8f5] p-1 rounded-xl border border-[#5c0f1b]/10">
                    {[5, 10, 15].map((l) => (
                      <button
                        key={l}
                        onClick={() => setTopLimit(l)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          topLimit === l
                            ? 'bg-[#5c0f1b] text-white shadow-2xs'
                            : 'text-stone-600 hover:text-[#5c0f1b]'
                        }`}
                      >
                        Top {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full overflow-y-auto max-h-[420px] flex-1">
                  <Suspense fallback={<div className="h-full flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#5c0f1b]" /></div>}>
                    <TopProductsBarChart data={metrics.productos_mas_vendidos} limit={topLimit} />
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
