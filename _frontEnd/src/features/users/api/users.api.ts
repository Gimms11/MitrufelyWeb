/**
 * API client del módulo de Gestión de Usuarios (Fase 7).
 */

import api from '@/lib/axios'
import type { UsuarioDetalle, UsuarioListItem, UsuariosFiltros } from '../types'

function toQuery(filtros?: UsuariosFiltros): Record<string, string> {
  if (!filtros) return {}
  const q: Record<string, string> = {}
  if (filtros['rol']) q['rol'] = filtros['rol']
  if (filtros['estado'] !== undefined) q['estado'] = String(filtros['estado'])
  if (filtros['search']) q['search'] = filtros['search']
  if (filtros['limit']) q['limit'] = String(filtros['limit'])
  if (filtros['offset']) q['offset'] = String(filtros['offset'])
  return q
}

export const usersApi = {
  async listar(filtros?: UsuariosFiltros): Promise<UsuarioListItem[]> {
    const { data } = await api.get<UsuarioListItem[]>('/admin/users', {
      params: toQuery(filtros),
    })
    return data
  },

  async detalle(id: number): Promise<UsuarioDetalle> {
    const { data } = await api.get<UsuarioDetalle>(`/admin/users/${id}`)
    return data
  },

  async actualizarEstado(id: number, estado: boolean): Promise<UsuarioListItem> {
    const { data } = await api.patch<UsuarioListItem>(
      `/admin/users/${id}/estado`,
      { estado },
    )
    return data
  },
}
