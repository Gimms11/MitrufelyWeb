import api from '@/lib/axios'
import type { Category, PaginatedResponse } from '../types'

export interface ListCategoriesParams {
  search?: string | undefined
  page?: number | undefined
  size?: number | undefined
}

export interface CategoryCreateRequest {
  nombre: string
  descripcion?: string | null | undefined
  estado?: boolean | undefined
}

export interface CategoryUpdateRequest {
  nombre?: string | undefined
  descripcion?: string | null | undefined
  estado?: boolean | undefined
}

export const categoriesApi = {
  /**
   * Listar todas las categorías para administración (incluye inactivas)
   */
  listCategoriesAdmin: async (params: ListCategoriesParams = {}): Promise<PaginatedResponse<Category>> => {
    const { data } = await api.get<PaginatedResponse<Category>>('/categorias/admin', { params })
    return data
  },

  /**
   * Listar solo categorías activas (para dropdowns y público)
   */
  listActiveCategories: async (params: ListCategoriesParams = {}): Promise<PaginatedResponse<Category>> => {
    const { data } = await api.get<PaginatedResponse<Category>>('/categorias/', { params })
    return data
  },

  /**
   * Obtener detalle de una categoría
   */
  getCategory: async (id: number): Promise<Category> => {
    const { data } = await api.get<Category>(`/categorias/${id}`)
    return data
  },

  /**
   * Crear una nueva categoría
   */
  createCategory: async (requestData: CategoryCreateRequest): Promise<Category> => {
    const { data } = await api.post<Category>('/categorias/', requestData)
    return data
  },

  /**
   * Actualizar una categoría existente
   */
  updateCategory: async (id: number, requestData: CategoryUpdateRequest): Promise<Category> => {
    const { data } = await api.put<Category>(`/categorias/${id}`, requestData)
    return data
  },

  /**
   * Eliminar lógicamente una categoría (Soft Delete)
   */
  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/categorias/${id}`)
  },
}
