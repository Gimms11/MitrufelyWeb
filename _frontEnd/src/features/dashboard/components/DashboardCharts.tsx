/**
 * DashboardCharts.tsx — Componente aislado con los gráficos de recharts
 *
 * Se carga con lazy() para que recharts (~1.1MB) no entre en el chunk principal
 * del dashboard ni bloquee el primer render. Solo se carga cuando hay datos.
 */

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { TrendingUp, Package } from 'lucide-react'

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface SalesChartProps {
  data: Array<{ fecha?: string; date?: string; total_ingresos?: number; ventas?: number; cantidad_pedidos?: number }>
}

interface ProductsChartProps {
  data: Array<{ nombre?: string; name?: string; total_vendido?: number; stock?: number; total_ingresos?: number }>
  limit?: number
}

// ─── Gráfico de ventas (AreaChart) ─────────────────────────────────────────

export function SalesAreaChart({ data }: SalesChartProps) {
  const formattedData = useMemo(() => {
    return (data || []).map((item) => ({
      ...item,
      fechaStr: item.fecha
        ? new Date(item.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
        : item.date || '',
      ingresos: Number(item.total_ingresos ?? item.ventas ?? 0),
    }))
  }, [data])

  if (!formattedData || formattedData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-stone-400 text-xs font-bold gap-2 p-8">
        <TrendingUp className="h-8 w-8 text-stone-300" />
        <span>No hay transacciones registradas en este periodo.</span>
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 20, right: 35, left: 15, bottom: 25 }}>
          <defs>
            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5c0f1b" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#5c0f1b" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1eeea" />
          <XAxis
            dataKey="fechaStr"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={75}
            tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }}
            tickFormatter={(val) => `S/.${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #5c0f1b20',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: '12px 16px',
              fontFamily: 'Inter, sans-serif',
            }}
            formatter={(value: number) => [`S/. ${Number(value || 0).toFixed(2)}`, 'Ingresos Totales']}
            labelFormatter={(label) => `Fecha: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="ingresos"
            stroke="#5c0f1b"
            strokeWidth={3}
            dot={{ r: 4, fill: '#ff7a45', stroke: '#ffffff', strokeWidth: 2 }}
            activeDot={{ r: 7, fill: '#5c0f1b', stroke: '#ffffff', strokeWidth: 3 }}
            fillOpacity={1}
            fill="url(#colorIngresos)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SalesAreaChartGeneric({ data }: SalesChartProps) {
  return <SalesAreaChart data={data} />
}

// ─── Gráfico de productos más vendidos (BarChart horizontal reactivo) ──────────

export function TopProductsBarChart({ data, limit = 10 }: ProductsChartProps) {
  const chartData = useMemo(() => {
    return (data || []).slice(0, limit).map((item) => {
      const full = item.nombre || item.name || 'Sin nombre'
      const short = full.length > 22 ? `${full.substring(0, 22)}...` : full
      return {
        ...item,
        shortName: short,
        fullName: full,
        vendido: Number(item.total_vendido ?? item.stock ?? 0),
        ingresos: Number(item.total_ingresos ?? 0),
      }
    })
  }, [data, limit])

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-stone-400 text-xs font-bold gap-2 p-8">
        <Package className="h-8 w-8 text-stone-300" />
        <span>No hay datos de productos disponibles.</span>
      </div>
    )
  }

  const dynamicHeight = Math.max(280, chartData.length * 44)

  return (
    <div className="w-full overflow-x-auto" style={{ minHeight: `${dynamicHeight}px` }}>
      <ResponsiveContainer width="100%" height={dynamicHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1eeea" />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }}
          />
          <YAxis
            dataKey="shortName"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#2a1115', fontWeight: 700 }}
            width={160}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #5c0f1b20',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: '12px 16px',
              fontFamily: 'Inter, sans-serif',
            }}
            labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
            formatter={(value: number, _, item: any) => [
              `${value} unidades ${item.payload.ingresos ? `(S/. ${Number(item.payload.ingresos).toFixed(2)})` : ''}`,
              'Total Vendido',
            ]}
          />
          <Bar dataKey="vendido" radius={[0, 8, 8, 0]} barSize={20}>
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? '#5c0f1b' : index < 3 ? '#ff7a45' : '#c44a1a'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Gráfico de inventario crítico (BarChart reactivo) ──────────

export function StockBarChart({ data }: ProductsChartProps) {
  const chartData = useMemo(() => {
    return (data || []).slice(0, 10).map((item) => {
      const full = item.nombre || item.name || 'Sin nombre'
      const short = full.length > 20 ? `${full.substring(0, 20)}...` : full
      return {
        ...item,
        shortName: short,
        fullName: full,
        stock: Number(item.stock ?? 0),
      }
    })
  }, [data])

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-stone-400 text-xs font-bold gap-2 p-8">
        <Package className="h-8 w-8 text-stone-300" />
        <span>Sin productos en bajo stock.</span>
      </div>
    )
  }

  const dynamicHeight = Math.max(280, chartData.length * 44)

  return (
    <div className="w-full overflow-x-auto" style={{ minHeight: `${dynamicHeight}px` }}>
      <ResponsiveContainer width="100%" height={dynamicHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1eeea" />
          <XAxis type="number" stroke="#a39891" fontSize={11} fontWeight="bold" />
          <YAxis
            dataKey="shortName"
            type="category"
            stroke="#a39891"
            fontSize={11}
            fontWeight="bold"
            width={140}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #5c0f1b20',
              fontSize: '12px',
            }}
            labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
            formatter={(value: number) => [`${value} unidades`, 'Stock Disponible']}
          />
          <Bar dataKey="stock" radius={[0, 8, 8, 0]} barSize={20}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={(entry.stock ?? 0) <= 5 ? '#ff4d4f' : '#ff7a45'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function DashboardCharts() {
  return null
}
