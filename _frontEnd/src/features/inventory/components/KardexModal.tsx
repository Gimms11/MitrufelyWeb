import { useState, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { X, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MovimientoStock } from '../types'
import { useKardexQuery } from '../hooks/useInventory'
import { AdminDataTable } from '@/features/products/components/AdminDataTable'

interface KardexModalProps {
  productoId: number
  productName: string
  onClose: () => void
}

export function KardexModal({ productoId, productName, onClose }: KardexModalProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const { data: kardexData, isLoading, isError } = useKardexQuery(productoId, {
    page: pageIndex + 1,
    page_size: pageSize,
  })

  const columns = useMemo<ColumnDef<MovimientoStock>[]>(
    () => [
      {
        accessorKey: 'fecha_movimiento',
        header: 'Fecha / Hora',
        cell: ({ row }) => {
          const val = row.getValue('fecha_movimiento') as string
          if (!val) return '-'
          return (
            <span className="text-xs font-mono text-stone-500">
              {new Date(val).toLocaleString()}
            </span>
          )
        },
      },
      {
        accessorKey: 'tipo_movimiento',
        header: 'Tipo de Movimiento',
        cell: ({ row }) => {
          const type = row.getValue('tipo_movimiento') as string
          const isNegative = ['VENTA', 'AJUSTE_NEGATIVO', 'MERMA', 'VENCIMIENTO'].includes(type)
          
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border',
                isNegative
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-green-50 text-green-700 border-green-200'
              )}
            >
              {isNegative ? (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              ) : (
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              )}
              {type.replace('_', ' ')}
            </span>
          )
        },
      },
      {
        accessorKey: 'id_lote',
        header: 'Lote físico',
        cell: ({ row }) => {
          const val = row.getValue('id_lote') as number | null
          if (!val) return <span className="text-stone-400 text-xs">FEFO / Auto</span>
          return <span className="font-mono text-xs font-bold text-stone-600">Lote #{val}</span>
        },
      },
      {
        accessorKey: 'cantidad',
        header: 'Cantidad',
        cell: ({ row }) => {
          const qty = row.getValue('cantidad') as number
          const type = row.original.tipo_movimiento
          const isNegative = ['VENTA', 'AJUSTE_NEGATIVO', 'MERMA', 'VENCIMIENTO'].includes(type)

          return (
            <span
              className={cn(
                'font-extrabold text-sm',
                isNegative ? 'text-red-600' : 'text-green-600'
              )}
            >
              {isNegative ? '-' : '+'}{qty} uds
            </span>
          )
        },
      },
      {
        accessorKey: 'stock_resultante',
        header: 'Kardex Resultante',
        cell: ({ row }) => (
          <span className="font-black text-[#5c0f1b]">{row.getValue('stock_resultante')} uds</span>
        ),
      },
      {
        accessorKey: 'observacion',
        header: 'Observación / Motivo',
        cell: ({ row }) => {
          const val = row.getValue('observacion') as string | null
          return (
            <span className="text-xs text-stone-600 max-w-xs block truncate" title={val || ''}>
              {val || <span className="text-stone-300 italic">Sin observaciones</span>}
            </span>
          )
        },
      },
    ],
    []
  )

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b border-stone-100 p-6">
        <div>
          <h2 className="text-xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Kardex: {productName}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Historial cronológico completo de entradas, salidas y ajustes de stock en base de datos.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-all cursor-pointer border-none bg-transparent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Contenido con la tabla */}
      <div className="flex-1 overflow-y-auto p-6">
        {isError ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-xs font-semibold">
            Error al cargar el Kardex de este producto.
          </div>
        ) : (
          <AdminDataTable
            columns={columns}
            data={kardexData?.items || []}
            searchKey="tipo_movimiento"
            searchPlaceholder="Filtrar movimientos..."
            isLoading={isLoading}
            pageCount={kardexData?.pages || 1}
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalCount={kardexData?.total || 0}
            onPageChange={(page) => setPageIndex(page - 1)}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPageIndex(0)
            }}
          />
        )}
      </div>
    </div>
  )
}
