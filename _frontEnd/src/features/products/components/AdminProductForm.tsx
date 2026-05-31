import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, Upload, Check } from 'lucide-react'
import type { Producto } from '../types'

const productFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(150, 'Máximo 150 caracteres'),
  precio: z.coerce.number().min(0.01, 'El precio debe ser estrictamente mayor a 0'),
  id_categoria: z.coerce.string().transform((val) => (val === '' ? null : Number(val))).nullable().optional(),
  descripcion: z.string().optional().nullable(),
  ingredientes: z.string().optional().nullable(),
  alergenos: z.string().max(255, 'Máximo 255 caracteres').optional().nullable(),
  peso_gramos: z.coerce.string().transform((val) => (val === '' ? null : Number(val))).nullable().refine((val) => val === null || val > 0, {
    message: 'El peso debe ser estrictamente mayor a 0 gramos',
  }).optional(),
  stock_minimo: z.coerce.number().min(0, 'El stock mínimo no puede ser negativo').default(0),
  estado: z.boolean().default(true),
})

type ProductFormValues = z.infer<typeof productFormSchema>

interface AdminProductFormProps {
  initialData?: Producto | undefined
  onSubmit: (formData: FormData) => void
  onCancel: () => void
  isSubmitting: boolean
}

export function AdminProductForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: AdminProductFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imagen_url || null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productFormSchema) as any,
    defaultValues: {
      nombre: initialData?.nombre || '',
      precio: initialData?.precio || 0,
      id_categoria: initialData?.id_categoria || null,
      descripcion: initialData?.descripcion || '',
      ingredientes: initialData?.ingredientes || '',
      alergenos: initialData?.alergenos || '',
      peso_gramos: initialData?.peso_gramos || null,
      stock_minimo: initialData?.stock_minimo || 0,
      estado: initialData?.estado !== false, // default true
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const formEstado = watch('estado')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFormSubmit = (values: ProductFormValues) => {
    const formData = new FormData()
    formData.append('nombre', values.nombre)
    formData.append('precio', String(values.precio))
    formData.append('id_categoria', values.id_categoria !== undefined && values.id_categoria !== null ? String(values.id_categoria) : '')
    formData.append('descripcion', values.descripcion || '')
    formData.append('ingredientes', values.ingredientes || '')
    formData.append('alergenos', values.alergenos || '')
    formData.append('peso_gramos', values.peso_gramos !== undefined && values.peso_gramos !== null ? String(values.peso_gramos) : '')
    formData.append('stock_minimo', String(values.stock_minimo))
    formData.append('estado', String(values.estado))

    if (selectedFile) {
      formData.append('image', selectedFile)
    }

    onSubmit(formData)
  }

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b border-stone-100 p-6">
        <div>
          <h2 className="text-xl font-black text-[#5c0f1b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {initialData ? 'Editar Producto' : 'Crear Nuevo Producto'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {initialData ? 'Actualiza los campos e imagen del producto en Cloudinary' : 'Registra un nuevo producto en el catálogo general'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-all cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Formulario con scroll */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Información General */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
                Nombre del Producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. Trufa Oreo Suprema"
                {...register('nombre')}
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115]"
              />
              {errors.nombre && (
                <p className="text-xs text-red-500 font-semibold mt-1">{errors.nombre.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
                  Precio (S/.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('precio')}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115]"
                />
                {errors.precio && (
                  <p className="text-xs text-red-500 font-semibold mt-1">{errors.precio.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
                  Categoría
                </label>
                <select
                  {...register('id_categoria')}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115] cursor-pointer"
                >
                  <option value="">Sin Categoría</option>
                  <option value="1">Best Sellers</option>
                  <option value="2">Nuevos Sabores</option>
                  <option value="3">Promociones</option>
                </select>
                {errors.id_categoria && (
                  <p className="text-xs text-red-500 font-semibold mt-1">{errors.id_categoria.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
                Descripción
              </label>
              <textarea
                placeholder="Detalla los sabores, texturas y presentación..."
                rows={3}
                {...register('descripcion')}
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
                  Stock Mínimo Alerta
                </label>
                <input
                  type="number"
                  placeholder="0"
                  {...register('stock_minimo')}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115]"
                />
                {errors.stock_minimo && (
                  <p className="text-xs text-red-500 font-semibold mt-1">{errors.stock_minimo.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
                  Peso (Gramos)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ej. 15.5"
                  {...register('peso_gramos')}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115]"
                />
                {errors.peso_gramos && (
                  <p className="text-xs text-red-500 font-semibold mt-1">{errors.peso_gramos.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Fórmulas y Alérgenos + Imagen */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
                  Ingredientes
                </label>
                <input
                  type="text"
                  placeholder="Ej. Chocolate belga 70%, crema de leche, galleta Oreo"
                  {...register('ingredientes')}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
                  Alérgenos
                </label>
                <input
                  type="text"
                  placeholder="Ej. Lactosa, Gluten, Soya"
                  {...register('alergenos')}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c0f1b]/20 focus:border-[#5c0f1b] transition-all text-[#2a1115]"
                />
              </div>
            </div>

            {/* Imagen del Producto */}
            <div>
              <label className="block text-xs font-bold text-[#5c0f1b] uppercase tracking-wider mb-1.5">
                Imagen del Producto
              </label>
              <div className="flex gap-4 items-center bg-stone-50 border border-stone-200 border-dashed p-4 rounded-xl">
                <div className="relative h-20 w-20 bg-stone-100 border border-stone-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Vista previa" className="h-full w-full object-cover" />
                  ) : (
                    <Upload className="h-6 w-6 text-stone-400" />
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  <span className="text-xs font-bold text-[#2a1115]">Adjuntar Archivo</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG o WEBP. Máx 5MB.</span>
                  
                  <label className="mt-2.5 self-start inline-flex items-center gap-1.5 bg-white border border-stone-200 hover:bg-stone-50 px-3 py-1.5 rounded-lg text-xs font-bold text-[#5c0f1b] shadow-xs transition-colors cursor-pointer select-none">
                    <Upload className="h-3.5 w-3.5" />
                    Seleccionar Imagen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Estado del Producto (Soft Delete) */}
            <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
              <div>
                <span className="text-xs font-bold text-[#2a1115]">Disponible administrativamente</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Si se desactiva, pasa a estado "Soft Delete" y no se mostrará a clientes ni en el catálogo de ventas
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
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-stone-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-stone-500 hover:text-stone-700 font-bold hover:bg-stone-100 disabled:opacity-50 text-sm transition-all border-none cursor-pointer"
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
                {initialData ? 'Guardar Cambios' : 'Crear Producto'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
