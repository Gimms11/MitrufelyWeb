import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import {
  ChevronDown,
  ChevronUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  onCreateNew?: () => void
  createButtonText?: string
  pageCount?: number
  pageIndex?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  isLoading?: boolean
  totalCount?: number
}

export function AdminDataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = 'Buscar...',
  onCreateNew,
  createButtonText = 'Nuevo',
  pageCount,
  pageIndex = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  totalCount = 0,
}: AdminDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const isServerPaginated = !!onPageChange

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(isServerPaginated
      ? { manualPagination: true }
      : { getPaginationRowModel: getPaginationRowModel() }),
  })

  // ─── CÁLCULO DE PÁGINAS Y NAVEGACIÓN DE PAGINACIÓN ───────────────────────
  const realTotal = isServerPaginated
    ? totalCount > 0
      ? totalCount
      : data.length
    : data.length

  const computedPages = pageSize > 0 ? Math.ceil(realTotal / pageSize) : 1
  const effectivePageCount = isServerPaginated
    ? Math.max(1, pageCount || 0, computedPages)
    : table.getPageCount() || 1

  const currentDisplayIndex = isServerPaginated
    ? pageIndex
    : table.getState().pagination.pageIndex

  const canGoPrevious = isServerPaginated
    ? currentDisplayIndex > 0
    : table.getCanPreviousPage()

  const canGoNext = isServerPaginated
    ? currentDisplayIndex + 1 < effectivePageCount
    : table.getCanNextPage()

  const handlePrev = () => {
    if (isServerPaginated && onPageChange) {
      onPageChange(currentDisplayIndex) // 1-based index de la página anterior
    } else {
      table.previousPage()
    }
  }

  const handleNext = () => {
    if (isServerPaginated && onPageChange) {
      onPageChange(currentDisplayIndex + 2) // 1-based index de la página siguiente
    } else {
      table.nextPage()
    }
  }

  const handleSizeChange = (newSize: number) => {
    if (isServerPaginated && onPageSizeChange) {
      onPageSizeChange(newSize)
    } else {
      table.setPageSize(newSize)
    }
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Barra de herramientas superior */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-[#5c0f1b]/10 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115]"
          />
        </div>

        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#5c0f1b] text-white hover:bg-[#7a1525] px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#5c0f1b]/15 transition-all hover:scale-[1.02] active:scale-95 border-none cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            {createButtonText}
          </button>
        )}
      </div>

      {/* Contenedor de la Tabla */}
      <div className="bg-white rounded-2xl border border-[#5c0f1b]/10 shadow-sm overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center z-10 transition-opacity duration-300">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#5c0f1b] border-t-transparent" />
              <p className="text-xs font-semibold text-[#5c0f1b]">Cargando datos...</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left text-sm text-[#2a1115]">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-[#5c0f1b]/10 bg-stone-50">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          'p-4 font-bold text-xs uppercase tracking-wider text-[#5c0f1b]/70 select-none',
                          canSort && 'cursor-pointer hover:bg-stone-100 hover:text-[#5c0f1b]',
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="flex flex-col text-stone-400">
                              {header.column.getIsSorted() === 'asc' ? (
                                <ChevronUp className="h-3 w-3 text-[#5c0f1b]" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ChevronDown className="h-3 w-3 text-[#5c0f1b]" />
                              ) : (
                                <span className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[#5c0f1b]/5 font-medium">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                    No se encontraron registros.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-stone-50/50 transition-colors duration-150"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-[#5c0f1b]/10 shadow-sm text-xs font-semibold text-stone-600">
        <div className="shrink-0">
          Mostrando <span className="text-[#5c0f1b] font-bold">{data.length}</span> de{' '}
          <span className="text-[#5c0f1b] font-bold">{realTotal}</span> registros
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-end gap-4 md:gap-6 w-full md:w-auto">
          {/* Botones de Desplazamiento de Página (SIEMPRE PRIMERO EN CONTROLES) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handlePrev}
              disabled={!canGoPrevious || isLoading}
              className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-950 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="px-3.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl font-extrabold text-[#5c0f1b] text-xs whitespace-nowrap shadow-2xs">
              Pág. {currentDisplayIndex + 1} de {effectivePageCount}
            </span>

            <button
              onClick={handleNext}
              disabled={!canGoNext || isLoading}
              className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-950 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Combobox de Filas por Página */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-stone-600 whitespace-nowrap">Filas por página:</span>
            <select
              value={pageSize}
              onChange={(e) => handleSizeChange(Number(e.target.value))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#5c0f1b] focus:border-[#5c0f1b] transition-all cursor-pointer font-extrabold text-stone-800 text-xs shadow-2xs"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
