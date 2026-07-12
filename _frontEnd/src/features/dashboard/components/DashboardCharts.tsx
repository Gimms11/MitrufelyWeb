/**
 * DashboardCharts.tsx — Componente aislado con los gráficos de recharts
 *
 * Se carga con lazy() para que recharts (~1.1MB) no entre en el chunk principal
 * del dashboard ni bloquee el primer render. Solo se carga cuando hay datos.
 */

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

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface SalesChartProps {
  data: Array<{ fecha?: string; date?: string; total_ingresos?: number; ventas?: number }>
}

interface ProductsChartProps {
  data: Array<{ nombre?: string; name?: string; total_vendido?: number; stock?: number }>
}

// ─── Gráfico de ventas (AreaChart) ─────────────────────────────────────────

export function SalesAreaChart({ data }: SalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#5c0f1b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#5c0f1b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="fecha"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickFormatter={(val) =>
            new Date(val).toLocaleDateString('es-PE', { weekday: 'short' })
          }
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickFormatter={(val) => `S/${val}`}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          itemStyle={{ color: '#2a1115' }}
          formatter={(value: number) => [`S/. ${Number(value || 0).toFixed(2)}`, 'Ingresos']}
        />
        <Area
          type="monotone"
          dataKey="total_ingresos"
          stroke="#5c0f1b"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorIngresos)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Gráfico de ventas genérico (para DashboardPage) ───────────────────────

export function SalesAreaChartGeneric({ data }: SalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#5c0f1b" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#5c0f1b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1eeea" />
        <XAxis dataKey="date" stroke="#a39891" fontSize={11} fontWeight="bold" />
        <YAxis
          stroke="#a39891"
          fontSize={11}
          fontWeight="bold"
          tickFormatter={(val) => `S/.${val}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #5c0f1b20',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
          }}
          itemStyle={{ color: '#2a1115' }}
          formatter={(value: number) => [`S/. ${Number(value).toFixed(2)}`, 'Ventas Cobradas']}
        />
        <Area
          type="monotone"
          dataKey="ventas"
          stroke="#5c0f1b"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorVentas)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Gráfico de productos más vendidos (BarChart horizontal) ───────────────

export function TopProductsBarChart({ data }: ProductsChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
        <YAxis
          dataKey="nombre"
          type="category"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#6b7280' }}
          width={100}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          itemStyle={{ color: '#2a1115' }}
          formatter={(value: number) => [`${value} unids.`, 'Vendido']}
        />
        <Bar dataKey="total_vendido" fill="#ff7a45" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Gráfico de inventario crítico (BarChart con celdas de color) ──────────

export function StockBarChart({ data }: ProductsChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1eeea" />
        <XAxis type="number" stroke="#a39891" fontSize={11} fontWeight="bold" />
        <YAxis
          dataKey="name"
          type="category"
          stroke="#a39891"
          fontSize={9}
          fontWeight="bold"
          width={80}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #5c0f1b20',
            fontSize: '12px',
          }}
          itemStyle={{ color: '#2a1115' }}
          formatter={(value: number) => [`${value} unidades`, 'Stock Disponible']}
        />
        <Bar dataKey="stock" radius={[0, 8, 8, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={(entry.stock ?? 0) <= 5 ? '#ff4d4f' : '#ff7a45'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function DashboardCharts() {
  return null
}
