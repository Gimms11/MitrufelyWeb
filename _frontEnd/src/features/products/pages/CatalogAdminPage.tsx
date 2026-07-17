import { useState } from 'react'
import { Link } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Sparkles,
  ArrowLeft,
  ShoppingBag,
  Gift,
  AlertTriangle,
  FolderOpen,
  Loader2,
  Package,
  X,
  Search,
  ChevronDown,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Producto, Pack, Category } from '../types'
import {
  useAdminProducts,
  useAdminPackages,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
} from '../hooks/useCatalogAdmin'
import {
  useAdminCategories,
  useActiveCategories,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from '../hooks/useCategories'
import { AdminDataTable } from '../components/AdminDataTable'
import { AdminProductForm } from '../components/AdminProductForm'
import { AdminPackageForm } from '../components/AdminPackageForm'
import { AdminCategoryForm } from '../components/AdminCategoryForm'

export default function CatalogAdminPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'packages' | 'categories'>('products')

  // Estados de paginación y filtros para productos
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const search = ''

  // Estados de paginación y filtros para categorías
  const [catPageIndex, setCatPageIndex] = useState(0)
  const [catPageSize, setCatPageSize] = useState(10)
  const catSearch = ''

  // Modales y Edición
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null)
  
  const [packageModalOpen, setPackageModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Pack | null>(null)

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Modal de Productos Asociados
  const [associatedProductsCategory, setAssociatedProductsCategory] = useState<string | null>(null)

  // ─── Consultas ─────────────────────────────────────────────────────────────
  
  // Productos paginados (backend)
  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
  } = useAdminProducts({
    page: pageIndex + 1,
    size: pageSize,
    search: search || undefined,
  })

  // Paquetes (backend listado simple)
  const {
    data: packagesData = [],
    isLoading: packagesLoading,
    isError: packagesError,
  } = useAdminPackages()

  // Categorías paginadas (backend)
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useAdminCategories({
    page: catPageIndex + 1,
    size: catPageSize,
    search: catSearch || undefined,
  })

  // ─── Mutaciones ────────────────────────────────────────────────────────────
  const createProductMut = useCreateProductMutation()
  const updateProductMut = useUpdateProductMutation()
  const deleteProductMut = useDeleteProductMutation()

  const createPackageMut = useCreatePackageMutation()
  const updatePackageMut = useUpdatePackageMutation()
  const deletePackageMut = useDeletePackageMutation()

  const createCategoryMut = useCreateCategoryMutation()
  const updateCategoryMut = useUpdateCategoryMutation()
  const deleteCategoryMut = useDeleteCategoryMutation()

  // ─── Handlers de Categoría ─────────────────────────────────────────────────
  const handleOpenNewCategory = () => {
    setEditingCategory(null)
    setCategoryModalOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryModalOpen(true)
  }

  const handleDeleteCategory = (category: Category) => {
    if (confirm(`¿Estás seguro de que deseas eliminar (soft delete) la categoría "${category.nombre}"?\nEsto fallará si tiene productos o cupones asociados.`)) {
      deleteCategoryMut.mutate(category.id_categoria)
    }
  }

  const handleCategorySubmit = (values: { nombre: string; estado: boolean; descripcion?: string | null | undefined }) => {
    if (editingCategory) {
      updateCategoryMut.mutate(
        { id: editingCategory.id_categoria, data: values },
        {
          onSuccess: () => setCategoryModalOpen(false),
        }
      )
    } else {
      createCategoryMut.mutate(values, {
        onSuccess: () => setCategoryModalOpen(false),
      })
    }
  }

  // ─── Handlers de Producto ──────────────────────────────────────────────────
  const handleOpenNewProduct = () => {
    setEditingProduct(null)
    setProductModalOpen(true)
  }

  const handleEditProduct = (product: Producto) => {
    setEditingProduct(product)
    setProductModalOpen(true)
  }

  const handleDeleteProduct = (product: Producto) => {
    if (confirm(`¿Estás seguro de que deseas eliminar (soft delete) el producto "${product.nombre}"?\nEsto afectará la disponibilidad de los paquetes que lo contienen.`)) {
      deleteProductMut.mutate(product.id_producto)
    }
  }

  const handleProductSubmit = (formData: FormData) => {
    if (editingProduct) {
      updateProductMut.mutate(
        { id: editingProduct.id_producto, formData },
        {
          onSuccess: () => setProductModalOpen(false),
        }
      )
    } else {
      createProductMut.mutate(formData, {
        onSuccess: () => setProductModalOpen(false),
      })
    }
  }

  // ─── Handlers de Paquete ───────────────────────────────────────────────────
  const handleOpenNewPackage = () => {
    setEditingPackage(null)
    setPackageModalOpen(true)
  }

  const handleEditPackage = (pack: Pack) => {
    setEditingPackage(pack)
    setPackageModalOpen(true)
  }

  const handleDeletePackage = (pack: Pack) => {
    if (confirm(`¿Estás seguro de que deseas eliminar (soft delete) el paquete "${pack.nombre}"?`)) {
      deletePackageMut.mutate(pack.id_paquete)
    }
  }

  const handlePackageSubmit = (formData: FormData) => {
    if (editingPackage) {
      updatePackageMut.mutate(
        { id: editingPackage.id_paquete, formData },
        {
          onSuccess: () => setPackageModalOpen(false),
        }
      )
    } else {
      createPackageMut.mutate(formData, {
        onSuccess: () => setPackageModalOpen(false),
      })
    }
  }

  // Todos los productos disponibles para asignarlos a paquetes (no paginados, traemos tamaño grande para poblar selects)
  const { data: allActiveProds } = useAdminProducts({ size: 100, activo: true })
  const activeProductsList = allActiveProds?.items || []

  // ─── Columnas ──────────────────────────────────────────────────────────────
  const productColumns: ColumnDef<Producto>[] = [
    {
      accessorKey: 'imagen_url',
      header: 'Imagen',
      cell: ({ row }) => {
        const url = row.getValue('imagen_url') as string
        return (
          <div className="h-12 w-12 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-2xs">
            {url ? (
              <img src={url} alt={row.getValue('nombre')} width={48} height={48} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-[#5c0f1b]/50">
                NO IMG
              </div>
            )}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre / Slug',
      cell: ({ row }) => (
        <div className="max-w-[220px]">
          <div className="font-bold text-[#2a1115] truncate" title={row.getValue('nombre') as string}>
            {row.getValue('nombre') as string}
          </div>
          <div className="font-mono text-[10px] text-stone-400 mt-0.5">{row.original.slug}</div>
          <div
            className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-tight"
            title={row.original.descripcion || 'Sin descripción (se usará por defecto)'}
          >
            {row.original.descripcion ||
              'Deliciosa trufa artesanal elaborada con ingredientes seleccionados de la más alta calidad, perfecta para endulzar tus momentos especiales.'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'precio',
      header: 'Precio',
      cell: ({ row }) => (
        <span className="font-bold text-[#5c0f1b]">
          S/. {Number(row.getValue('precio') || 0).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'stock_actual',
      header: 'Inventario',
      cell: ({ row }) => {
        const stock = row.getValue('stock_actual') as number
        const min = row.original.stock_minimo
        const isLow = stock <= min
        return (
          <div>
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold',
                isLow ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100',
              )}
            >
              {stock} uds
            </span>
            {isLow && <div className="text-[9px] text-red-500 font-bold mt-0.5">⚠️ Mínimo ({min})</div>}
          </div>
        )
      },
    },
    {
      accessorKey: 'disponible',
      header: 'Disp. Comercial',
      cell: ({ row }) => {
        const disponible = row.getValue('disponible') as boolean
        return (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider',
              disponible ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-stone-50 text-stone-400 border border-stone-200',
            )}
          >
            {disponible ? 'Disponible' : 'Agotado'}
          </span>
        )
      },
    },
    {
      accessorKey: 'estado',
      header: 'Estado Admin',
      cell: ({ row }) => {
        const estado = row.getValue('estado') as boolean
        return (
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider',
              estado ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200',
            )}
          >
            {estado ? 'Activo' : 'Soft Deleted'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditProduct(row.original)}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 hover:text-[#5c0f1b] transition-colors cursor-pointer border-none"
            title="Editar producto"
          >
            <EditIcon className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => handleDeleteProduct(row.original)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors cursor-pointer border-none"
            title="Eliminar producto"
          >
            <TrashIcon className="h-4.5 w-4.5" />
          </button>
        </div>
      ),
    },
  ]

  const packageColumns: ColumnDef<Pack>[] = [
    {
      accessorKey: 'imagen_url',
      header: 'Portada',
      cell: ({ row }) => {
        const url = row.getValue('imagen_url') as string
        return (
          <div className="h-12 w-12 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-2xs">
            {url ? (
              <img src={url} alt={row.getValue('nombre')} width={48} height={48} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-[#5c0f1b]/50">
                NO IMG
              </div>
            )}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre / Slug',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-[#2a1115]">{row.getValue('nombre')}</div>
          <div className="font-mono text-[10px] text-stone-400 mt-0.5">{row.original.slug}</div>
        </div>
      ),
    },
    {
      accessorKey: 'precio',
      header: 'Precio Paquete',
      cell: ({ row }) => (
        <span className="font-bold text-[#5c0f1b]">
          S/. {Number(row.getValue('precio') || 0).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'productos',
      header: 'Composición',
      cell: ({ row }) => {
        const count = (row.getValue('productos') as unknown[]).length
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#5c0f1b]/5 text-[#5c0f1b] border border-[#5c0f1b]/10">
            {count} trufas distintas
          </span>
        )
      },
    },
    {
      accessorKey: 'disponible',
      header: 'Disp. Catálogo',
      cell: ({ row }) => {
        const disponible = row.getValue('disponible') as boolean
        return (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider',
              disponible ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-stone-50 text-stone-400 border border-stone-200',
            )}
          >
            {disponible ? 'Disponible' : 'No Disponible'}
          </span>
        )
      },
    },
    {
      accessorKey: 'estado',
      header: 'Estado Admin',
      cell: ({ row }) => {
        const estado = row.getValue('estado') as boolean
        return (
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider',
              estado ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200',
            )}
          >
            {estado ? 'Activo' : 'Soft Deleted'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditPackage(row.original)}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 hover:text-[#5c0f1b] transition-colors cursor-pointer border-none"
            title="Editar paquete"
          >
            <EditIcon className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => handleDeletePackage(row.original)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors cursor-pointer border-none"
            title="Eliminar paquete"
          >
            <TrashIcon className="h-4.5 w-4.5" />
          </button>
        </div>
      ),
    },
  ]

  const categoryColumns: ColumnDef<Category>[] = [
    {
      accessorKey: 'id_categoria',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-stone-400">
          #{row.getValue('id_categoria')}
        </span>
      ),
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre / Slug',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-[#2a1115]">{row.getValue('nombre')}</div>
          <div className="font-mono text-[10px] text-stone-400 mt-0.5">{row.original.slug}</div>
        </div>
      ),
    },
    {
      accessorKey: 'descripcion',
      header: 'Descripción',
      cell: ({ row }) => {
        const desc = row.getValue('descripcion') as string
        return (
          <span className="text-stone-500 text-xs block max-w-xs truncate">
            {desc || '-'}
          </span>
        )
      },
    },
    {
      id: 'productos',
      header: 'Productos',
      cell: ({ row }) => (
        <button
          onClick={() => setAssociatedProductsCategory(row.original.nombre)}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#5c0f1b]/5 hover:bg-[#5c0f1b]/10 text-[#5c0f1b] border border-[#5c0f1b]/10 transition-all cursor-pointer select-none w-fit"
        >
          <Package className="h-3.5 w-3.5" />
          Ver Productos
        </button>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado Admin',
      cell: ({ row }) => {
        const estado = row.getValue('estado') as boolean
        return (
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider',
              estado ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200',
            )}
          >
            {estado ? 'Activo' : 'Soft Deleted'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditCategory(row.original)}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 hover:text-[#5c0f1b] transition-colors cursor-pointer border-none bg-transparent"
            title="Editar categoría"
          >
            <EditIcon className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => handleDeleteCategory(row.original)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors cursor-pointer border-none bg-transparent"
            title="Eliminar categoría"
          >
            <TrashIcon className="h-4.5 w-4.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2a1115] font-sans antialiased pb-12">
      {/* Cabecera de control */}
      <header className="bg-white border-b border-[#5c0f1b]/10 sticky top-0 z-40 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black bg-[#ff7a45]/12 border border-[#ff7a45]/20 px-2.5 py-1 rounded-full text-[#ff7a45] uppercase tracking-wide">
                  Panel de Control
                </span>
                <Sparkles className="h-4 w-4 text-[#ff7a45] animate-pulse" />
              </div>
              <h1 className="text-2xl font-black text-[#5c0f1b] tracking-tight mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Gestión de Catálogo Comercial
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Cuerpo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Selector de Pestañas (Tabs) */}
        <div className="flex border-b border-[#5c0f1b]/10 gap-6">
          <button
            onClick={() => setActiveTab('products')}
            className={cn(
              'pb-4 text-sm font-black transition-all cursor-pointer flex items-center gap-2 relative',
              activeTab === 'products'
                ? 'text-[#5c0f1b]'
                : 'text-stone-400 hover:text-stone-600'
            )}
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            Productos / Trufas
            {activeTab === 'products' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#5c0f1b] rounded-t-full" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('packages')}
            className={cn(
              'pb-4 text-sm font-black transition-all cursor-pointer flex items-center gap-2 relative',
              activeTab === 'packages'
                ? 'text-[#5c0f1b]'
                : 'text-stone-400 hover:text-stone-600'
            )}
          >
            <Gift className="h-4.5 w-4.5" />
            Paquetes Promocionales
            {activeTab === 'packages' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#5c0f1b] rounded-t-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              'pb-4 text-sm font-black transition-all cursor-pointer flex items-center gap-2 relative',
              activeTab === 'categories'
                ? 'text-[#5c0f1b]'
                : 'text-stone-400 hover:text-stone-600'
            )}
          >
            <FolderOpen className="h-4.5 w-4.5" />
            Categorías
            {activeTab === 'categories' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#5c0f1b] rounded-t-full" />
            )}
          </button>
        </div>

        {/* Pestaña: Productos */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {productsError ? (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-semibold">Error al cargar productos del servidor. Revisa tu conexión.</span>
              </div>
            ) : (
              <AdminDataTable
                columns={productColumns}
                data={productsData?.items || []}
                searchKey="nombre"
                searchPlaceholder="Buscar por nombre..."
                onCreateNew={handleOpenNewProduct}
                createButtonText="Nuevo Producto"
                isLoading={productsLoading}
                pageCount={productsData?.pages || 1}
                pageIndex={pageIndex}
                pageSize={pageSize}
                totalCount={productsData?.total || 0}
                onPageChange={(page) => setPageIndex(page - 1)}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPageIndex(0)
                }}
              />
            )}
          </div>
        )}

        {/* Pestaña: Paquetes */}
        {activeTab === 'packages' && (
          <div className="space-y-4">
            {packagesError ? (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-semibold">Error al cargar paquetes del servidor.</span>
              </div>
            ) : (
              <AdminDataTable
                columns={packageColumns}
                data={packagesData}
                searchKey="nombre"
                searchPlaceholder="Buscar por nombre..."
                onCreateNew={handleOpenNewPackage}
                createButtonText="Nuevo Paquete"
                isLoading={packagesLoading}
              />
            )}
          </div>
        )}

        {/* Pestaña: Categorías */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            {categoriesError ? (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-semibold">Error al cargar categorías del servidor.</span>
              </div>
            ) : (
              <AdminDataTable
                columns={categoryColumns}
                data={categoriesData?.items || []}
                searchKey="nombre"
                searchPlaceholder="Buscar por nombre..."
                onCreateNew={handleOpenNewCategory}
                createButtonText="Nueva Categoría"
                isLoading={categoriesLoading}
                pageCount={categoriesData?.pages || 1}
                pageIndex={catPageIndex}
                pageSize={catPageSize}
                totalCount={categoriesData?.total || 0}
                onPageChange={(page) => setCatPageIndex(page - 1)}
                onPageSizeChange={(size) => {
                  setCatPageSize(size)
                  setCatPageIndex(0)
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* ── Modal de Producto ── */}
      {productModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setProductModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl relative border border-[#5c0f1b]/10 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <AdminProductForm
              initialData={editingProduct || undefined}
              onSubmit={handleProductSubmit}
              onCancel={() => setProductModalOpen(false)}
              isSubmitting={createProductMut.isPending || updateProductMut.isPending}
            />
          </div>
        </div>
      )}

      {/* ── Modal de Paquete ── */}
      {packageModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPackageModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl relative border border-[#5c0f1b]/10 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <AdminPackageForm
              initialData={editingPackage || undefined}
              productsList={activeProductsList}
              onSubmit={handlePackageSubmit}
              onCancel={() => setPackageModalOpen(false)}
              isSubmitting={createPackageMut.isPending || updatePackageMut.isPending}
            />
          </div>
        </div>
      )}

      {/* ── Modal de Categoría ── */}
      {categoryModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCategoryModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl relative border border-[#5c0f1b]/10 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <AdminCategoryForm
              initialData={editingCategory || undefined}
              onSubmit={handleCategorySubmit}
              onCancel={() => setCategoryModalOpen(false)}
              isSubmitting={createCategoryMut.isPending || updateCategoryMut.isPending}
            />
          </div>
        </div>
      )}
      {/* ── Modal de Productos Asociados ── */}
      {associatedProductsCategory && (
        <CategoryProductsModal
          nombre_categoria={associatedProductsCategory}
          onClose={() => setAssociatedProductsCategory(null)}
        />
      )}
    </div>
  )
}

// ── Iconos auxiliares consistentes ──

function EditIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

interface CategoryProductsModalProps {
  nombre_categoria: string
  onClose: () => void
}

function CategoryProductsModal({ nombre_categoria, onClose }: CategoryProductsModalProps) {
  const [updatingProdId, setUpdatingProdId] = useState<number | null>(null)
  
  // Combobox category reassignment state
  const [activeComboboxProduct, setActiveComboboxProduct] = useState<Producto | null>(null)
  const [comboboxCoords, setComboboxCoords] = useState({ top: 0, left: 0 })
  const [searchQuery, setSearchQuery] = useState('')

  // Query products inside this category
  const { data: productsData, isLoading: productsLoading } = useAdminProducts(
    {
      categoria: nombre_categoria,
      size: 50,
    }
  )

  // Query active categories list for the dropdown options
  const { data: categoriesRes } = useActiveCategories(
    {
      size: 100,
    }
  )

  const products = productsData?.items || []
  const activeCategoriesList = categoriesRes?.items || []
  const updateProductMut = useUpdateProductMutation()

  const handleMoveProduct = (productId: number, newCatIdStr: string) => {
    setUpdatingProdId(productId)
    const newCatId = newCatIdStr === "" ? "null" : newCatIdStr

    const formData = new FormData()
    formData.append("id_categoria", newCatId)

    updateProductMut.mutate(
      { id: productId, formData },
      {
        onSettled: () => {
          setUpdatingProdId(null)
        },
      }
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-default animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="bg-[#faf8f5] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative border border-[#5c0f1b]/10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[75vh] text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#5c0f1b] px-6 py-5 flex items-center justify-between text-white">
          <div>
            <span className="text-[10px] font-black uppercase bg-white/15 px-2.5 py-0.5 rounded-full text-white tracking-wider">
              Productos Asociados
            </span>
            <h3 className="text-xl font-black tracking-tight mt-1.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {nombre_categoria}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer border-none bg-transparent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List Body */}
        <div
          className="p-6 overflow-y-auto flex-1 space-y-4"
          onScroll={() => {
            if (activeComboboxProduct !== null) {
              setActiveComboboxProduct(null)
            }
          }}
        >
          {productsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-stone-400">
              <Loader2 className="h-8 w-8 animate-spin text-[#5c0f1b]" />
              <span className="text-xs font-black">Cargando productos...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-stone-400">
              <Package className="h-12 w-12 text-stone-300 stroke-1" />
              <span className="text-xs font-bold">Sin productos asociados</span>
            </div>
          ) : (
            <div className="space-y-2.5 pr-0.5">
              {products.map((prod) => (
                <div
                  key={prod.id_producto}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-stone-50/50 rounded-2xl transition-all border border-stone-200/50 bg-white shadow-2xs group"
                >
                  {/* Thumbnail */}
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-2xs flex-shrink-0 relative">
                    {prod.imagen_url ? (
                      <img src={prod.imagen_url} alt={prod.nombre} width={48} height={48} loading="lazy" decoding="async" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-[#5c0f1b]/40">
                        <Package className="h-5 w-5 stroke-1" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-[#2a1115] truncate" title={prod.nombre}>
                      {prod.nombre}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-black text-[#5c0f1b]">
                        S/. {Number(prod.precio || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        SKU: {prod.slug}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    {updatingProdId === prod.id_producto ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#5c0f1b]" />
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const rect = e.currentTarget.getBoundingClientRect()
                          setComboboxCoords({
                            top: rect.bottom + 4,
                            left: rect.right - 240, // align right edge with button's right edge
                          })
                          setActiveComboboxProduct(prod)
                          setSearchQuery('')
                        }}
                        type="button"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black bg-[#5c0f1b]/5 hover:bg-[#5c0f1b]/10 text-[#5c0f1b] border border-[#5c0f1b]/10 transition-all cursor-pointer select-none active:scale-95"
                      >
                        Mover
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Category Combobox Menu */}
      {activeComboboxProduct && (
        <>
          <div
            className="fixed inset-0 z-60 bg-transparent cursor-default"
            onClick={(e) => {
              e.stopPropagation()
              setActiveComboboxProduct(null)
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: comboboxCoords.top,
              left: comboboxCoords.left,
            }}
            className="z-70 bg-white border border-[#5c0f1b]/20 rounded-2xl shadow-xl w-60 p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar categoría..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5c0f1b] focus:border-[#5c0f1b] transition-all font-bold text-stone-700"
                autoFocus
              />
            </div>

            {/* List */}
            <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
              {/* Option: Sin Categoría */}
              {(searchQuery === '' || 'sin categoría'.includes(searchQuery.toLowerCase())) && (
                <button
                  onClick={() => {
                    handleMoveProduct(activeComboboxProduct.id_producto, '')
                    setActiveComboboxProduct(null)
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-xs font-black rounded-lg transition-colors cursor-pointer border-none flex items-center justify-between",
                    !activeComboboxProduct.id_categoria
                      ? "bg-[#5c0f1b]/10 text-[#5c0f1b]"
                      : "bg-transparent hover:bg-stone-50 text-stone-600 hover:text-[#5c0f1b]"
                  )}
                >
                  <span>Sin Categoría</span>
                  {!activeComboboxProduct.id_categoria && <span className="h-1.5 w-1.5 rounded-full bg-[#5c0f1b]" />}
                </button>
              )}

              {/* Categorías filtradas */}
              {activeCategoriesList
                .filter((cat) => cat.nombre.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((cat) => {
                  const isCurrent = activeComboboxProduct.id_categoria === cat.id_categoria
                  return (
                    <button
                      key={cat.id_categoria}
                      onClick={() => {
                        handleMoveProduct(activeComboboxProduct.id_producto, String(cat.id_categoria))
                        setActiveComboboxProduct(null)
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 text-xs font-black rounded-lg transition-colors cursor-pointer border-none flex items-center justify-between",
                        isCurrent
                          ? "bg-[#5c0f1b]/10 text-[#5c0f1b]"
                          : "bg-transparent hover:bg-stone-50 text-stone-600 hover:text-[#5c0f1b]"
                      )}
                    >
                      <span className="truncate">{cat.nombre}</span>
                      {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-[#5c0f1b]" />}
                    </button>
                  )
                })}

              {activeCategoriesList.filter((cat) => cat.nombre.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 &&
                !(searchQuery === '' || 'sin categoría'.includes(searchQuery.toLowerCase())) && (
                  <div className="text-[10px] text-stone-400 py-3 text-center font-bold">
                    No se encontraron categorías
                  </div>
                )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


