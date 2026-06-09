/**
 * types.ts — Dominio: Productos / Trufas
 *
 * Interfaces públicas del catálogo de Mitrufely.
 * Siguiendo SRP: este módulo sólo describe la forma de los datos del dominio.
 */

// ─── Literales de categoría ────────────────────────────────────────────────

export type TrufaCategoria = 'best_sellers' | 'new_flavors' | 'promos'

// Alias semántico reutilizable en el estado de la página
export type TabKey = TrufaCategoria

// ─── Entidades del dominio ─────────────────────────────────────────────────

export interface Trufa {
  id: number
  nombre: string
  categoria: TrufaCategoria
  precio: number
  imagenUrl: string
  descripcion: string
  /** Etiqueta decorativa opcional (ej. "🔥 Popular") */
  badge?: string
}

export interface PaqueteProducto {
  id_paquete_producto: number
  id_paquete: number
  id_producto: number
  cantidad: number
}

export interface Pack {
  id_paquete: number
  nombre: string
  slug: string
  descripcion: string | null
  imagen_url: string | null
  estado: boolean
  fecha_creacion: string
  fecha_actualizacion: string
  productos: PaqueteProducto[]
  disponible: boolean
  precio: number // decimal devuelto por el backend
}

// ─── UI — Tabs del catálogo ────────────────────────────────────────────────

export interface TabItem {
  readonly key: TrufaCategoria
  readonly label: string
}

// ─── Modelos del Backend para Administración (CRUD) ─────────────────────────

export interface Producto {
  id_producto: number
  id_categoria: number | null
  nombre: string
  descripcion: string | null
  ingredientes: string | null
  alergenos: string | null
  peso_gramos: number | null
  precio: number
  stock_minimo: number
  stock_actual: number
  imagen_url: string | null
  cloudinary_public_id: string | null
  estado: boolean
  disponible: boolean
  slug: string
  fecha_creacion: string
  fecha_actualizacion: string
  // ── Campos extendidos para la vista de detalle ──────────────────────────
  /** Nombre legible de la categoría (ej. "Trufa Clásica") */
  categoria_nombre?: string | undefined
  /** Rating promedio del producto (1-5) */
  rating?: number | undefined
  /** Instrucciones de almacenamiento (temperatura, humedad, etc.) */
  consideraciones_almacenamiento?: string | undefined
  /** Días de vida útil desde fabricación */
  tiempo_vida_dias?: number | undefined
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  size: number
  total: number
  pages: number
}

