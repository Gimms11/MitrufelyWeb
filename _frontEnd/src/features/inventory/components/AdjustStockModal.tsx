import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, Check, Info } from 'lucide-react'
import type { Producto } from '@/features/products/types'
import type { Lote, TipoMovimientoStock } from '../types'
import { useLotsQuery } from '../hooks/useInventory'

const adjustStockSchema = z.object({
  id_producto: z.coerce.number().min(1, 'El producto es obligatorio'),
  id_lote: z.coerce.number().min(1, 'El lote es obligatorio'),
  tipo_movimiento: z.enum(['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'MERMA'], {
    errorMap: () => ({ message: 'Seleccione un tipo de ajuste válido' }),
  }),
  cantidad: z.coerce.number().min(1, 'La cantidad debe ser mayor a 0'),
  observacion: z.string().max(500, 'Máximo 500 caracteres').optional().nullable(),
})

type AdjustStockFormValues = z.infer<typeof adjustStockSchema>

interface AdjustStockModalProps {
  productsList: Producto[]
  initialLot?: Lote | null
  onSubmit: (data: {
    id_producto: number
    id_lote: number
    tipo_movimiento: TipoMovimientoStock
    cantidad: number
    observacion?: string | null
  }) => void
  onCancel: () => void
  isSubmitting: boolean
}

export function AdjustStockModal({
  productsList,
  initialLot,
  onSubmit,
  onCancel,
  isSubmitting,
}: AdjustStockModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema) as any,
    defaultValues: {
      id_producto: initialLot?.id_producto || 0,
      id_lote: initialLot?.id_lote || 0,
      tipo_movimiento: 'AJUSTE_NEGATIVO',
      cantidad: 1,
      observacion: '',
    },
  })

  // Watch values for dynamic filtering
  const watchedProductId = watch('id_producto')
  const watchedLoteId = watch('id_lote')

  // Query for lots if product is selected (only when no initialLot is provided)
  const { data: lotsData, isLoading: loadingLots } = useLotsQuery(
    watchedProductId ? Number(watchedProductId) : null,
    {
      solo_vigentes: true,
    }
  )

  const activeLots = useMemo(() => {
    return lotsData || []
  }, [lotsData])

  // Find selected lot to show available quantity info
  const selectedLot = useMemo(() => {
    if (initialLot) return initialLot
    return activeLots.find((l) => l.id_lote === Number(watchedLoteId)) || null
  }, [initialLot, activeLots, watchedLoteId])

  // Set lot value when initialLot is supplied or when lots list changes and only one lot exists
  useEffect(() => {
    if (initialLot) {
      setValue('id_producto', initialLot.id_producto)
      setValue('id_lote', initialLot.id_lote)
    }
  }, [initialLot, setValue])

  const handleFormSubmit = (values: AdjustStockFormValues) => {
    onSubmit({
      id_producto: values.id_producto,
      id_lote: values.id_lote,
      tipo_movimiento: values.tipo_movimiento as TipoMovimientoStock,
      cantidad: values.cantidad,
      observacion: values.observacion ?? null,
    })
  }

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b border-stone-100 p-6">
        <div>
          <h2 className="text-xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Ajustar Stock de Lote
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registra una merma o corrección de inventario (positivo/negativo) sobre un lote específico.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-all cursor-pointer border-none bg-transparent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="space-y-4">
          
          {/* Info Banner when editing specific lot */}
          {initialLot && (
            <div className="bg-stone-50 border border-[#5c0f1b]/10 p-4 rounded-2xl flex items-start gap-3">
              <Info className="h-5 w-5 text-[#5c0f1b] mt-0.5 flex-shrink-0" />
              <div className="text-xs text-[#2a1115]">
                <p className="font-bold">Ajuste dirigido al lote #{initialLot.id_lote}</p>
                <p className="mt-1">
                  Cantidad disponible en este lote:{' '}
                  <span className="font-extrabold text-[#5c0f1b]">
                    {initialLot.cantidad_disponible} uds
                  </span>
                </p>
                {initialLot.fecha_vencimiento && (
                  <p className="mt-0.5 text-stone-500">
                    Vence el: {new Date(initialLot.fecha_vencimiento).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Seleccionar Producto (si no hay initialLot) */}
          {!initialLot && (
            <div>
              <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
                Producto <span className="text-red-500">*</span>
              </label>
              <select
                {...register('id_producto')}
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115] cursor-pointer"
              >
                <option value="">Selecciona un producto...</option>
                {productsList.map((p) => (
                  <option key={p.id_producto} value={p.id_producto}>
                    {p.nombre} (Stock actual: {p.stock_actual} uds)
                  </option>
                ))}
              </select>
              {errors.id_producto && (
                <p className="text-xs text-red-500 font-semibold mt-1">{errors.id_producto.message}</p>
              )}
            </div>
          )}

          {/* Seleccionar Lote (si no hay initialLot) */}
          {!initialLot && watchedProductId > 0 && (
            <div>
              <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
                Lote Físico Destino <span className="text-red-500">*</span>
              </label>
              {loadingLots ? (
                <p className="text-xs text-stone-400">Cargando lotes disponibles...</p>
              ) : activeLots.length === 0 ? (
                <p className="text-xs text-amber-600 font-semibold">
                  ⚠️ No hay lotes vigentes con stock para este producto. Registra uno nuevo primero.
                </p>
              ) : (
                <select
                  {...register('id_lote')}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115] cursor-pointer"
                >
                  <option value="">Selecciona el lote...</option>
                  {activeLots.map((l) => (
                    <option key={l.id_lote} value={l.id_lote}>
                      Lote #{l.id_lote} (Disp: {l.cantidad_disponible} uds
                      {l.fecha_vencimiento ? ` | Vence: ${new Date(l.fecha_vencimiento).toLocaleDateString()}` : ''})
                    </option>
                  ))}
                </select>
              )}
              {errors.id_lote && (
                <p className="text-xs text-red-500 font-semibold mt-1">{errors.id_lote.message}</p>
              )}
            </div>
          )}

          {/* Tipo de Ajuste */}
          <div>
            <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
              Tipo de Movimiento <span className="text-red-500">*</span>
            </label>
            <select
              {...register('tipo_movimiento')}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115] cursor-pointer"
            >
              <option value="AJUSTE_NEGATIVO">AJUSTE NEGATIVO (Corrección de stock a la baja)</option>
              <option value="MERMA">MERMA (Pérdida por daño, rotura o descarte)</option>
              <option value="AJUSTE_POSITIVO">AJUSTE POSITIVO (Corrección de stock al alza)</option>
            </select>
            {errors.tipo_movimiento && (
              <p className="text-xs text-red-500 font-semibold mt-1">{errors.tipo_movimiento.message}</p>
            )}
          </div>

          {/* Cantidad a Ajustar */}
          <div>
            <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
              Cantidad a Ajustar (Unidades) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="Ej. 5"
              {...register('cantidad')}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115]"
            />
            {selectedLot && (
              <p className="text-[10px] text-stone-500 mt-1">
                Stock actual del lote: <span className="font-bold">{selectedLot.cantidad_disponible} uds</span>.
              </p>
            )}
            {errors.cantidad && (
              <p className="text-xs text-red-500 font-semibold mt-1">{errors.cantidad.message}</p>
            )}
          </div>

          {/* Observación / Razón */}
          <div>
            <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
              Observación / Motivo
            </label>
            <textarea
              placeholder="Ej. Descarte por merma de humedad en refrigerador..."
              rows={3}
              {...register('observacion')}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115] resize-none"
            />
            {errors.observacion && (
              <p className="text-xs text-red-500 font-semibold mt-1">{errors.observacion.message}</p>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-stone-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-stone-500 hover:text-stone-700 font-bold hover:bg-stone-100 disabled:opacity-50 text-sm transition-all border-none cursor-pointer bg-transparent"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 bg-[#5c0f1b] text-white hover:bg-[#7a1525] px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-[#5c0f1b]/15 disabled:opacity-50 transition-all border-none cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Aplicando...
              </>
            ) : (
              <>
                <Check className="h-4.5 w-4.5" />
                Aplicar Ajuste
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
