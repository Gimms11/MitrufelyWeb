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
  nombres?: string | null
  apellidos?: string | null
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  referencia?: string | null
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
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

  changePassword: async (payload: { current_password: string; new_password: string }): Promise<void> => {
    await api.post('/auth/me/password', payload)
  },

  uploadAvatar: async (file: File): Promise<{ avatar_url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/auth/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },
}
