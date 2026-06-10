import api from '@/lib/axios'

export interface DatosFiscalesResponse {
  id_dato_fiscal: number
  id_usuario: number
  tipo_documento: 'DNI' | 'RUC'
  numero_documento: string
  razon_social: string | null
  direccion_fiscal: string | null
  es_predeterminado: boolean
}

export interface DatosFiscalesUpsert {
  tipo_documento: 'DNI' | 'RUC'
  numero_documento: string
  razon_social?: string | null
  direccion_fiscal?: string | null
}

export interface UserProfileUpdate {
  telefono?: string | null
  direccion?: string | null
  referencia?: string | null
}

export const profileApi = {
  getDatosFiscales: async (): Promise<DatosFiscalesResponse | null> => {
    const { data } = await api.get<DatosFiscalesResponse | null>('/auth/me/datos-fiscales')
    return data
  },

  upsertDatosFiscales: async (payload: DatosFiscalesUpsert): Promise<DatosFiscalesResponse> => {
    const { data } = await api.post<DatosFiscalesResponse>('/auth/me/datos-fiscales', payload)
    return data
  },

  updateProfile: async (payload: UserProfileUpdate): Promise<void> => {
    await api.put('/auth/me', payload)
  },
}
