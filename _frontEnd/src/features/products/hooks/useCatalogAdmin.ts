/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogAdminApi } from '../api/catalogAdminApi'
import type { ListProductsParams } from '../api/catalogAdminApi'
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

export const useAdminProducts = (params: ListProductsParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['admin-products', params],
    queryFn: () => catalogAdminApi.listProductsAdmin(params),
    placeholderData: (prev) => prev,
    ...options,
  })
}

export const useActiveProducts = (params: ListProductsParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => catalogAdminApi.listActiveProducts(params),
    placeholderData: (prev) => prev,
    ...options,
  })
}

export const useAdminPackages = () => {
  return useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => catalogAdminApi.listPackagesAdmin(),
  })
}

export const useCreateProductMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => catalogAdminApi.createProduct(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Producto creado con éxito ✨')
    },
    onError: (error: any) => {
      const detail = formatErrorDetail(error, 'Error al crear el producto.')
      toast.error(`Error: ${detail}`, { duration: 6000 })
    },
  })
}

export const useUpdateProductMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      catalogAdminApi.updateProduct(id, formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] })
      queryClient.invalidateQueries({ queryKey: ['packages'] })
      toast.success(`Producto "${data.nombre}" actualizado con éxito ✨`)
    },
    onError: (error: any) => {
      const detail = formatErrorDetail(error, 'Error al actualizar el producto.')
      toast.error(`Error: ${detail}`, { duration: 6000 })
    },
  })
}

export const useDeleteProductMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => catalogAdminApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] })
      queryClient.invalidateQueries({ queryKey: ['packages'] })
      toast.success('Producto eliminado con éxito ✨')
    },
    onError: (error: any) => {
      const detail = formatErrorDetail(error, 'Error al eliminar el producto.')
      toast.error(`Error: ${detail}`)
    },
  })
}

export const useCreatePackageMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => catalogAdminApi.createPackage(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] })
      queryClient.invalidateQueries({ queryKey: ['packages'] })
      toast.success('Paquete creado con éxito ✨')
    },
    onError: (error: any) => {
      const detail = formatErrorDetail(error, 'Error al crear el paquete.')
      toast.error(`Error: ${detail}`, { duration: 6000 })
    },
  })
}

export const useUpdatePackageMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      catalogAdminApi.updatePackage(id, formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] })
      queryClient.invalidateQueries({ queryKey: ['packages'] })
      queryClient.invalidateQueries({ queryKey: ['packages', data.id_paquete] })
      toast.success(`Paquete "${data.nombre}" actualizado con éxito ✨`)
    },
    onError: (error: any) => {
      const detail = formatErrorDetail(error, 'Error al actualizar el paquete.')
      toast.error(`Error: ${detail}`, { duration: 6000 })
    },
  })
}

export const useDeletePackageMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => catalogAdminApi.deletePackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] })
      queryClient.invalidateQueries({ queryKey: ['packages'] })
      toast.success('Paquete eliminado con éxito ✨')
    },
    onError: (error: any) => {
      const detail = formatErrorDetail(error, 'Error al eliminar el paquete.')
      toast.error(`Error: ${detail}`)
    },
  })
}
