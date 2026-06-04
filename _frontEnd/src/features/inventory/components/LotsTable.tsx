import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { History, SlidersHorizontal, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lote } from '../types'
import type { Producto } from '@/features/products/types'
import { AdminDataTable } from '@/features/products/components/AdminDataTable'

interface LotsTableProps {
  lots: Lote[]
  productsList: Producto[]
  isLoading: boolean
  onAdjustStock: (lot: Lote) => void
  onViewKardex: (productoId: number, productName: string) => void
}

export function LotsTable({
  lots,
  productsList,
  isLoading,
  onAdjustStock,
  onViewKardex,
}: LotsTableProps) {
  // Create a product map for quick lookup
  const productMap = useMemo(() => {
    const map = new Map<number, string>()
    productsList.forEach((p) => {
      map.set(p.id_producto, p.nombre)
    })
    return map
  }, [productsList])

  const columns = useMemo<ColumnDef<Lote>[]>(
    () => [
      {
        accessorKey: 'id_lote',
        header: 'ID Lote',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-stone-500">
            #{row.getValue('id_lote')}
          </span>
        ),
      },
      {
        accessorKey: 'id_producto',
        header: 'Producto',
        cell: ({ row }) => {
          const id = row.getValue('id_producto') as number
          const name = productMap.get(id) || `Producto #${id}`
          return <span className="font-bold text-[#2a1115]">{name}</span>
        },
      },
      {
        accessorKey: 'fecha_ingreso',
        header: 'Fecha Ingreso',
        cell: ({ row }) => {
          const val = row.getValue('fecha_ingreso') as string
          if (!val) return '-'
          return <span className="text-xs">{new Date(val).toLocaleDateString()}</span>
        },
      },
      {
        accessorKey: 'fecha_vencimiento',
        header: 'Vencimiento',
        cell: ({ row }) => {
          const val = row.getValue('fecha_vencimiento') as string | null
          if (!val) return <span className="text-xs text-stone-400">Sin vencimiento</span>

          const date = new Date(val)
          const diffTime = date.getTime() - new Date().getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          const isExpiringSoon = diffDays > 0 && diffDays <= 7
          const isExpired = diffDays <= 0

          return (
            <div className="flex flex-col">
              <span
                className={cn(
                  'text-xs font-bold',
                  isExpired
                    ? 'text-red-600'
                    : isExpiringSoon
                    ? 'text-amber-600'
                    : 'text-stone-600'
                )}
              >
                {date.toLocaleDateString()}
              </span>
              {isExpired && (
                <span className="text-[10px] font-black text-red-600 uppercase tracking-wider mt-0.5">
                  Vencido
                </span>
              )}
              {!isExpired && isExpiringSoon && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase tracking-wider mt-0.5">
                  <AlertTriangle className="h-3 w-3 animate-pulse" />
                  Vence en {diffDays} {diffDays === 1 ? 'día' : 'días'}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'cantidad_inicial',
        header: 'Cant. Inicial',
        cell: ({ row }) => (
          <span className="font-semibold text-stone-600">{row.getValue('cantidad_inicial')} uds</span>
        ),
      },
      {
        accessorKey: 'cantidad_disponible',
        header: 'Stock Disp.',
        cell: ({ row }) => {
          const qty = row.getValue('cantidad_disponible') as number
          return (
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border',
                qty === 0
                  ? 'bg-stone-50 text-stone-400 border-stone-200'
                  : 'bg-green-50 text-green-700 border-green-200'
              )}
            >
              {qty} uds
            </span>
          )
        },
      },
      {
        accessorKey: 'estado_lote',
        header: 'Estado',
        cell: ({ row }) => {
          const status = row.getValue('estado_lote') as string
          return (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider',
                status === 'VIGENTE'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : status === 'AGOTADO'
                  ? 'bg-stone-50 text-stone-400 border border-stone-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              )}
            >
              {status}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => {
          const lot = row.original
          const productName = productMap.get(lot.id_producto) || `Producto #${lot.id_producto}`
          const isLoteVencido = lot.estado_lote === 'VENCIDO'

          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewKardex(lot.id_producto, productName)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 hover:text-[#5c0f1b] transition-colors cursor-pointer border-none bg-transparent"
                title="Ver Historial Kardex"
              >
                <History className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => onAdjustStock(lot)}
                disabled={isLoteVencido}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 hover:text-[#ff7a45] disabled:opacity-30 disabled:hover:bg-transparent disabled:text-stone-400 transition-colors cursor-pointer border-none bg-transparent"
                title={isLoteVencido ? 'No se permiten ajustes en lotes vencidos' : 'Ajustar Stock'}
              >
                <SlidersHorizontal className="h-4.5 w-4.5" />
              </button>
            </div>
          )
        },
      },
    ],
    [productMap, onAdjustStock, onViewKardex]
  )

  return (
    <AdminDataTable
      columns={columns}
      data={lots}
      searchKey="id_producto"
      searchPlaceholder="Filtrar lotes..."
      isLoading={isLoading}
    />
  )
}
