import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, Check } from 'lucide-react'
import type { Producto } from '@/features/products/types'

const registerLotSchema = z.object({
  id_producto: z.coerce.number().min(1, 'El producto es obligatorio'),
  cantidad_inicial: z.coerce.number().min(1, 'La cantidad debe ser mayor a 0'),
  fecha_vencimiento: z
    .string()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        const selected = new Date(val)
        return selected > new Date()
      },
      {
        message: 'La fecha de vencimiento debe ser posterior a la fecha y hora actual',
      }
    ),
})

type RegisterLotFormValues = z.infer<typeof registerLotSchema>

interface RegisterLotModalProps {
  productsList: Producto[]
  onSubmit: (data: { id_producto: number; cantidad_inicial: number; fecha_vencimiento: string | null }) => void
  onCancel: () => void
  isSubmitting: boolean
}

export function RegisterLotModal({
  productsList,
  onSubmit,
  onCancel,
  isSubmitting,
}: RegisterLotModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterLotFormValues>({
    resolver: zodResolver(registerLotSchema) as any,
    defaultValues: {
      id_producto: 0,
      cantidad_inicial: 1,
      fecha_vencimiento: null,
    },
  })

  const handleFormSubmit = (values: RegisterLotFormValues) => {
    // Normalise ISO string or send null
    const isoDate = values.fecha_vencimiento ? new Date(values.fecha_vencimiento).toISOString() : null
    onSubmit({
      id_producto: values.id_producto,
      cantidad_inicial: values.cantidad_inicial,
      fecha_vencimiento: isoDate,
    })
  }

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b border-stone-100 p-6">
        <div>
          <h2 className="text-xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Ingresar Nuevo Lote Físico
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registra una nueva tanda o lote físico en el almacén. El stock total se incrementará automáticamente.
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
          {/* Seleccionar Producto */}
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

          {/* Cantidad Inicial */}
          <div>
            <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
              Cantidad Inicial (Unidades) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="Ej. 100"
              {...register('cantidad_inicial')}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115]"
            />
            {errors.cantidad_inicial && (
              <p className="text-xs text-red-500 font-semibold mt-1">{errors.cantidad_inicial.message}</p>
            )}
          </div>

          {/* Fecha Vencimiento */}
          <div>
            <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
              Fecha de Vencimiento
            </label>
            <input
              type="datetime-local"
              {...register('fecha_vencimiento')}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115] cursor-pointer"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Debe ser una fecha futura. Requerido para el control y rotación de stock por FEFO.
            </p>
            {errors.fecha_vencimiento && (
              <p className="text-xs text-red-500 font-semibold mt-1">{errors.fecha_vencimiento.message}</p>
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
                Registrando...
              </>
            ) : (
              <>
                <Check className="h-4.5 w-4.5" />
                Ingresar Lote
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
