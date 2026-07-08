/**
 * Tipos del módulo de Gestión de Usuarios (Fase 7).
 * Espejo de `app/modules/users/schemas.py`.
 */

export interface UsuarioListItem {
  id_usuario: number
  nombres: string
  apellidos: string
  email: string
  telefono: string | null
  estado: boolean
  auth_provider: string
  rol: { id_rol: number; nombre: string }
  cliente: { id_cliente: number; direccion: string | null; telefono: string | null } | null
  total_ventas: number
  ultima_actividad: string | null
}

export interface UsuarioDetalle extends UsuarioListItem {
  documento_fiscal: string | null
  tipo_documento_fiscal: string | null
  razon_social: string | null
}

export interface UsuariosFiltros {
  rol?: string | undefined
  estado?: boolean | undefined
  search?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}
