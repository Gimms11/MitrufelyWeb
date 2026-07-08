/**
 * AdminUsersPage — Reporte de Gestión de Usuarios (Fase 7).
 * Lista usuarios con rol, estado de cuenta y actividad. Permite activar/desactivar
 * cuentas (borrado lógico) y filtrar por rol, estado o búsqueda parcial.
 */

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users as UsersIcon,
  Search,
  Loader2,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Phone,
  XCircle,
  RefreshCw,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'

import { useUsersQuery, useToggleUserEstadoMutation } from '../hooks/useUsers'
import { descargarBlob, reportsApi } from '@/features/reports/api/reports.api'
import type { UsuarioListItem } from '../types'

type RolFiltro = 'all' | 'ADMIN' | 'CLIENTE'
type EstadoFiltro = 'all' | 'activos' | 'inactivos'

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [rolFiltro, setRolFiltro] = useState<RolFiltro>('all')
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('all')
  const [detalle, setDetalle] = useState<UsuarioListItem | null>(null)
  const [exportando, setExportando] = useState(false)

  // Los filtros se aplican client-side sobre la lista completa (trae hasta 200)
  const { data: usuarios = [], isLoading, refetch, isFetching } = useUsersQuery({
    limit: 200,
  })

  const toggleMutation = useToggleUserEstadoMutation()

  const filtrados = useMemo(() => {
    return usuarios.filter((u) => {
      if (rolFiltro !== 'all' && u.rol.nombre !== rolFiltro) return false
      if (estadoFiltro === 'activos' && !u.estado) return false
      if (estadoFiltro === 'inactivos' && u.estado) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const blob = `${u.nombres} ${u.apellidos} ${u.email}`.toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [usuarios, rolFiltro, estadoFiltro, search])

  const stats = useMemo(() => {
    const activos = filtrados.filter((u) => u.estado).length
    const admins = filtrados.filter((u) => u.rol.nombre === 'ADMIN').length
    return {
      total: filtrados.length,
      activos,
      inactivos: filtrados.length - activos,
      admins,
    }
  }, [filtrados])

  const handleToggle = (u: UsuarioListItem) => {
    const accion = u.estado ? 'desactivar' : 'activar'
    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} la cuenta de ${u.nombres}?`)) {
      return
    }
    toggleMutation.mutate({ id: u.id_usuario, estado: !u.estado })
  }

  const handleExport = async (formato: 'pdf' | 'excel') => {
    setExportando(true)
    try {
      const stamp = new Date().toISOString().split('T')[0]
      if (formato === 'pdf') {
        const blob = await reportsApi.descargarPdf('usuarios', {
          search: search || undefined,
          estado: rolFiltro !== 'all' ? (rolFiltro as string) : undefined,
        })
        descargarBlob(blob, `reporte_usuarios_${stamp}.pdf`)
      } else {
        const blob = await reportsApi.descargarExcel('usuarios', {
          search: search || undefined,
          estado: rolFiltro !== 'all' ? (rolFiltro as string) : undefined,
        })
        descargarBlob(blob, `reporte_usuarios_${stamp}.xlsx`)
      }
      toast.success(`Reporte de usuarios (${formato.toUpperCase()}) descargado`)
    } catch {
      toast.error('No se pudo generar el reporte')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#5c0f1b] flex items-center gap-2">
            <UsersIcon className="h-8 w-8 text-[#ff7a45]" />
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-stone-500 font-semibold">
            Administra las cuentas del sistema: roles, estados y actividad.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={exportando}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5c0f1b] text-white text-xs font-black uppercase tracking-wide hover:bg-[#7a1525] active:scale-95 transition disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={exportando}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ff7a45] text-white text-xs font-black uppercase tracking-wide hover:brightness-110 active:scale-95 transition disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total" value={stats.total} />
        <KpiCard label="Activos" value={stats.activos} accent="green" />
        <KpiCard label="Inactivos" value={stats.inactivos} accent="red" />
        <KpiCard label="Admins" value={stats.admins} accent="orange" />
      </div>

      {/* Tarjeta principal */}
      <div className="bg-white rounded-3xl p-6 border border-[#5c0f1b]/8 shadow-sm space-y-4">
        {/* Filtros */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-3 bg-[#faf8f5] px-4 py-2.5 rounded-2xl border border-[#5c0f1b]/10 flex-1">
            <Search className="h-4 w-4 text-[#5c0f1b]/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="bg-transparent border-none outline-none flex-1 text-sm font-semibold text-[#2a1115] placeholder:text-stone-400"
            />
          </div>
          <select
            value={rolFiltro}
            onChange={(e) => setRolFiltro(e.target.value as RolFiltro)}
            className="px-4 py-2.5 rounded-2xl border border-[#5c0f1b]/10 bg-[#faf8f5] text-sm font-bold text-[#2a1115] outline-none cursor-pointer"
          >
            <option value="all">Todos los roles</option>
            <option value="ADMIN">Administradores</option>
            <option value="CLIENTE">Clientes</option>
          </select>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as EstadoFiltro)}
            className="px-4 py-2.5 rounded-2xl border border-[#5c0f1b]/10 bg-[#faf8f5] text-sm font-bold text-[#2a1115] outline-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-2xl border border-[#5c0f1b]/10 bg-[#faf8f5] hover:bg-[#5c0f1b]/5 transition cursor-pointer"
            title="Refrescar"
          >
            <RefreshCw className={`h-4 w-4 text-[#5c0f1b] ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#5c0f1b]" />
          </div>
        ) : filtrados.length === 0 ? (
          <p className="text-center py-12 font-bold text-stone-400">
            No se encontraron usuarios con los filtros aplicados.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="text-left px-4 py-3">Usuario</th>
                  <th className="text-left px-4 py-3">Rol</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Auth</th>
                  <th className="text-left px-4 py-3">Ventas</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-[#2a1115] font-semibold">
                {filtrados.map((u) => (
                  <tr
                    key={u.id_usuario}
                    className="hover:bg-[#faf8f5]/50 transition cursor-pointer"
                    onClick={() => setDetalle(u)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-black">{u.nombres} {u.apellidos}</div>
                      <div className="text-xs text-stone-500 font-medium">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black ${
                          u.rol.nombre === 'ADMIN'
                            ? 'bg-[#5c0f1b]/10 text-[#5c0f1b]'
                            : 'bg-[#ff7a45]/10 text-[#7a1525]'
                        }`}
                      >
                        <Shield className="h-3 w-3" />
                        {u.rol.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black ${
                          u.estado
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.estado ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {u.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600">
                      {u.auth_provider === 'google' ? 'Google' : 'Local'}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600">{u.total_ventas}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggle(u)
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition active:scale-95 cursor-pointer ${
                          u.estado
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {u.estado ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal detalle */}
      <AnimatePresence>
        {detalle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto flex flex-col border border-stone-200 shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-100">
                <h3 className="text-xl font-black text-[#5c0f1b]">Detalle de Usuario</h3>
                <button onClick={() => setDetalle(null)} className="cursor-pointer">
                  <XCircle className="h-6 w-6 text-stone-400 hover:text-stone-600" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-[#5c0f1b]/10 flex items-center justify-center mb-2">
                    <UsersIcon className="h-8 w-8 text-[#5c0f1b]" />
                  </div>
                  <h4 className="text-lg font-black text-[#2a1115]">
                    {detalle.nombres} {detalle.apellidos}
                  </h4>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black mt-1 ${
                      detalle.rol.nombre === 'ADMIN'
                        ? 'bg-[#5c0f1b]/10 text-[#5c0f1b]'
                        : 'bg-[#ff7a45]/10 text-[#7a1525]'
                    }`}
                  >
                    <Shield className="h-3 w-3" />
                    {detalle.rol.nombre}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <Fila icon={<Mail className="h-4 w-4" />} label="Email" value={detalle.email} />
                  {detalle.telefono && (
                    <Fila icon={<Phone className="h-4 w-4" />} label="Teléfono" value={detalle.telefono} />
                  )}
                  <Fila
                    icon={<UserCheck className="h-4 w-4" />}
                    label="Estado"
                    value={detalle.estado ? 'Activo' : 'Inactivo'}
                  />
                  <Fila
                    icon={<Shield className="h-4 w-4" />}
                    label="Autenticación"
                    value={detalle.auth_provider === 'google' ? 'Google OAuth' : 'Email + Password'}
                  />
                  <Fila
                    icon={<UsersIcon className="h-4 w-4" />}
                    label="Total ventas"
                    value={String(detalle.total_ventas)}
                  />
                  {detalle.ultima_actividad && (
                    <Fila
                      icon={<RefreshCw className="h-4 w-4" />}
                      label="Última actividad"
                      value={new Date(detalle.ultima_actividad).toLocaleString('es-PE')}
                    />
                  )}
                </div>

                <button
                  onClick={() => {
                    handleToggle(detalle)
                    setDetalle(null)
                  }}
                  className={`w-full py-3.5 rounded-full text-sm font-black uppercase tracking-wide transition active:scale-95 cursor-pointer ${
                    detalle.estado
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-[#5c0f1b] text-white hover:bg-[#7a1525]'
                  }`}
                >
                  {detalle.estado ? 'Desactivar cuenta' : 'Activar cuenta'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'green' | 'red' | 'orange'
}) {
  const color =
    accent === 'green'
      ? 'text-green-600'
      : accent === 'red'
        ? 'text-red-600'
        : accent === 'orange'
          ? 'text-[#ff7a45]'
          : 'text-[#5c0f1b]'
  return (
    <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wider text-stone-400">{label}</p>
      <p className={`text-3xl font-black ${color} mt-1`}>{value}</p>
    </div>
  )
}

function Fila({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-50">
      <span className="flex items-center gap-2 text-stone-500 font-bold">{icon} {label}</span>
      <span className="font-black text-[#2a1115]">{value}</span>
    </div>
  )
}
