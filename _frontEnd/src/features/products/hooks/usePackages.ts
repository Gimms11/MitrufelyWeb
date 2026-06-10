import { useQuery } from '@tanstack/react-query'
import { packagesApi } from '../api/packagesApi'
import type { Pack } from '../types'

export const usePackages = () => {
  return useQuery<Pack[], Error>({
    queryKey: ['packages'],
    queryFn: () => packagesApi.getAll(),
    staleTime: 5 * 60 * 1000, // Caché de 5 minutos
  })
}

export const usePackageDetail = (id: number) => {
  return useQuery<Pack, Error>({
    queryKey: ['packages', id],
    queryFn: () => packagesApi.getById(id),
    enabled: !!id,
  })
}

export const usePackageBySlug = (slug: string) => {
  return useQuery<Pack, Error>({
    queryKey: ['packages', 'slug', slug],
    queryFn: () => packagesApi.getBySlug(slug),
    enabled: !!slug,
  })
}
