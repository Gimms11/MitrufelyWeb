import api from '@/lib/axios'
import type { Pack } from '../types'

export const packagesApi = {
  /**
   * Obtiene la lista de paquetes disponibles públicamente.
   */
  getAll: async (): Promise<Pack[]> => {
    const { data } = await api.get<Pack[]>('/packages/')
    // Si la API devuelve un APIResponse<Pack[]>, se extraería data.data
    // Según nuestro mock actual el router GET /packages devuelve directamente List[PaqueteResponse]
    // Aseguraremos que el router retorna una lista (FastAPI la retorna por defecto si es List[])
    return data
  },

  /**
   * Obtiene un paquete específico por ID.
   */
  getById: async (id: number): Promise<Pack> => {
    const { data } = await api.get<Pack>(`/packages/${id}`)
    return data
  },

  getBySlug: async (slug: string): Promise<Pack> => {
    const { data } = await api.get<Pack>(`/packages/slug/${slug}`)
    return data
  },
}
