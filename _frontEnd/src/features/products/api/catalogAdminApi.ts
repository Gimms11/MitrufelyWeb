import api from '@/lib/axios'
import type { Producto, PaginatedResponse, Pack } from '../types'

export interface ListProductsParams {
  search?: string | undefined
  categoria?: string | undefined
  activo?: boolean | undefined
  stock?: string | undefined
  page?: number | undefined
  size?: number | undefined
  sort?: string | undefined
}

export const catalogAdminApi = {
  // ─── PRODUCTOS ─────────────────────────────────────────────────────────────
  
  /**
   * Listar todos los productos con filtros para administración
   */
  listProductsAdmin: async (params: ListProductsParams = {}): Promise<PaginatedResponse<Producto>> => {
    const { data } = await api.get<PaginatedResponse<Producto>>('/products/admin', { params })
    return data
  },

  /**
   * Obtener detalle de un producto por ID
   */
  getProduct: async (id: number): Promise<Producto> => {
    const { data } = await api.get<Producto>(`/products/${id}`)
    return data
  },

  /**
   * Crear un nuevo producto (multipart/form-data)
   */
  createProduct: async (formData: FormData): Promise<Producto> => {
    const { data } = await api.post<Producto>('/products/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },

  /**
   * Actualizar un producto existente (multipart/form-data)
   */
  updateProduct: async (id: number, formData: FormData): Promise<Producto> => {
    const { data } = await api.put<Producto>(`/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },

  /**
   * Eliminar físicamente/lógicamente un producto (Soft Delete)
   */
  deleteProduct: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`)
  },

  // ─── PAQUETES ──────────────────────────────────────────────────────────────

  /**
   * Listar todos los paquetes para administración
   */
  listPackagesAdmin: async (limit = 100, offset = 0): Promise<Pack[]> => {
    const { data } = await api.get<Pack[]>('/packages/admin', {
      params: { limit, offset },
    })
    return data
  },

  /**
   * Obtener detalle de un paquete por ID
   */
  getPackage: async (id: number): Promise<Pack> => {
    const { data } = await api.get<Pack>(`/packages/${id}`)
    return data
  },

  /**
   * Crear un nuevo paquete (multipart/form-data)
   */
  createPackage: async (formData: FormData): Promise<Pack> => {
    const { data } = await api.post<Pack>('/packages/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },

  /**
   * Actualizar un paquete existente (multipart/form-data)
   */
  updatePackage: async (id: number, formData: FormData): Promise<Pack> => {
    const { data } = await api.put<Pack>(`/packages/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },

  /**
   * Eliminar un paquete (Soft Delete)
   */
  deletePackage: async (id: number): Promise<void> => {
    await api.delete(`/packages/${id}`)
  },
}
