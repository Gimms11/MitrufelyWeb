import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, Check } from 'lucide-react'
import type { Category } from '../types'

const categoryFormSchema = z.object({
  nombre: z.string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder los 100 caracteres'),
  descripcion: z.string()
    .trim()
    .max(500, 'La descripción no puede exceder los 500 caracteres')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  estado: z.boolean().default(true),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

interface AdminCategoryFormProps {
  initialData?: Category | undefined
  onSubmit: (values: CategoryFormValues) => void
  onCancel: () => void
  isSubmitting: boolean
}

export function AdminCategoryForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: AdminCategoryFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(categoryFormSchema) as any,
    defaultValues: {
      nombre: initialData?.nombre || '',
      descripcion: initialData?.descripcion || '',
      estado: initialData?.estado !== false, // default true
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const formEstado = watch('estado')

  const handleFormSubmit = (values: CategoryFormValues) => {
    onSubmit(values)
  }

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b border-stone-100 p-6">
        <div>
          <h2 className="text-xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {initialData ? 'Editar Categoría' : 'Crear Nueva Categoría'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {initialData ? 'Modifica los atributos básicos de la categoría' : 'Registra una nueva categoría para organizar tus productos'}
          </p>
        </div>
        <button
          onClick={onCancel}
          type="button"
          className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-all cursor-pointer border-none bg-transparent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
              Nombre de la Categoría <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Trufas de Autor"
              {...register('nombre')}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115]"
            />
            {errors.nombre && (
              <p className="text-xs text-red-500 font-semibold mt-1">{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
              Descripción
            </label>
            <textarea
              placeholder="Ej. Trufas gourmet con licores finos e ingredientes exóticos..."
              rows={4}
              {...register('descripcion')}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115] resize-none"
            />
            {errors.descripcion && (
              <p className="text-xs text-red-500 font-semibold mt-1">{errors.descripcion.message}</p>
            )}
          </div>

          {/* Estado de la Categoría (Soft Delete) */}
          <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
            <div>
              <span className="text-xs font-bold text-[#2a1115]">Categoría Activa</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Las categorías inactivas no se muestran en el catálogo público ni en el listado para clientes
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formEstado}
                onChange={(e) => setValue('estado', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5c0f1b]"></div>
            </label>
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
                Guardando...
              </>
            ) : (
              <>
                <Check className="h-4.5 w-4.5" />
                {initialData ? 'Guardar Cambios' : 'Crear Categoría'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
