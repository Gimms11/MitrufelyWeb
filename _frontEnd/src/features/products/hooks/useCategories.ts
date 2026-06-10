/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '../api/categoriesApi'
import type { ListCategoriesParams, CategoryCreateRequest, CategoryUpdateRequest } from '../api/categoriesApi'
import { toast } from 'sonner'

const formatErrorDetail = (error: any, defaultMsg: string): string => {
  const customMessage = error?.response?.data?.error?.message
  if (customMessage) return customMessage

  const detail = error?.response?.data?.detail
  if (!detail) return defaultMsg
  if (Array.isArray(detail)) {
    return detail
      .map((err: any) => {
        const fieldName = err.loc && err.loc.length > 1 ? err.loc.slice(1).join('.') : ''
        return fieldName ? `[${fieldName}]: ${err.msg}` : err.msg
      })
      .join(', ')
  }
  if (typeof detail === 'string') return detail
  return defaultMsg
}

export const useAdminCategories = (params: ListCategoriesParams) => {
  return useQuery({
    queryKey: ['admin-categories', params],
    queryFn: () => categoriesApi.listCategoriesAdmin(params),
    placeholderData: (prev) => prev,
  })
}

export const useActiveCategories = (params: ListCategoriesParams = {}, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: () => categoriesApi.listActiveCategories(params),
    staleTime: 0,
    ...options,
  })
}

export const useCreateCategoryMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CategoryCreateRequest) => categoriesApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoría creada con éxito ✨')
    },
    onError: (error: any) => {
      const detail = formatErrorDetail(error, 'Error al crear la categoría.')
      toast.error(`Error: ${detail}`, { duration: 6000 })
    },
  })
}

export const useUpdateCategoryMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryUpdateRequest }) =>
      categoriesApi.updateCategory(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(`Categoría "${data.nombre}" actualizada con éxito ✨`)
    },
    onError: (error: any) => {
      const detail = formatErrorDetail(error, 'Error al actualizar la categoría.')
      toast.error(`Error: ${detail}`, { duration: 6000 })
    },
  })
}

export const useDeleteCategoryMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => categoriesApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Categoría eliminada con éxito ✨')
    },
    onError: (error: any) => {
      const detail = formatErrorDetail(error, 'Error al eliminar la categoría.')
      toast.error(`Error: ${detail}`, { duration: 6000 })
    },
  })
}
