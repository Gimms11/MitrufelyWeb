/**
 * criptotrufa.store.ts — Store global de CriptoTrufa (Sistema de Fidelización).
 *
 * Modela los esquemas Pydantic del backend (06_CRIPTOTRUFA.md):
 *   - CuponMaestroResponse
 *   - CuponClienteResponse
 *   - MovimientoPuntosResponse
 *
 * Acciones disponibles:
 *   - canjearCupon(id_cupon)      → COMPRA_CUPON (-costo_puntos)
 *   - jugarRuleta()               → PAGO_JUEGO (-50 pts) + PREMIO_JUEGO async
 *   - setRuletaResultado(result)  → actualiza resultado tras setTimeout
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'

// ─── Enums (mirrors de los ENUMs del backend) ─────────────────────────────────

export type EstadoCuponEnum   = 'DISPONIBLE' | 'USADO' | 'EXPIRADO'
export type OrigenCuponEnum   = 'COMPRA_PUNTOS' | 'REGALO_ADMIN' | 'PREMIO_JUEGO' | 'REGISTRO_NUEVO'
export type TipoMovimientoPuntosEnum =
  | 'ACUMULACION_VENTA'
  | 'COMPRA_CUPON'
  | 'AJUSTE_ADMIN'
  | 'EXPIRACION'
  | 'PAGO_JUEGO'
  | 'PREMIO_JUEGO'

// ─── Interfaces TypeScript (basadas en Schemas Pydantic) ─────────────────────

export interface CuponMaestro {
  id_cupon: number
  nombre: string
  descripcion: string | null
  porcentaje_descuento: number   // Decimal como number en frontend
  costo_puntos: number | null    // null si no es canjeable con puntos
  dias_vigencia: number
  estado: boolean
}

export interface CuponCliente {
  id_cupon_cliente: number
  codigo_unico: string           // Ej: MTR-A3F2
  estado: EstadoCuponEnum
  origen: OrigenCuponEnum
  fecha_adquisicion: string      // ISO string
  fecha_expiracion: string       // ISO string
  fecha_uso: string | null
  cupon: CuponMaestro            // nested — espeja CuponClienteResponse
}

export interface MovimientoPuntos {
  id_movimiento_punto: number
  tipo_movimiento: TipoMovimientoPuntosEnum
  cantidad: number               // Positivo o negativo
  saldo_puntos_resultante: number
  fecha_movimiento: string       // ISO string
  justificacion: string | null
}

// ─── Resultado de la ruleta ───────────────────────────────────────────────────

export type RuletaResultadoTipo = 'mala_suerte' | 'puntos_extra' | 'cupon_sorpresa' | null

export interface RuletaResultado {
  tipo: RuletaResultadoTipo
  mensaje: string
  puntosGanados: number
}

// ─── Estado del store ─────────────────────────────────────────────────────────

interface CriptoTrufaState {
  // Datos
  saldoActual: number
  cuponesCliente: CuponCliente[]
  cuponesMaestro: CuponMaestro[]
  historialMovimientos: MovimientoPuntos[]

  // UI
  ruletaGirando: boolean
  ruletaResultado: RuletaResultado | null

  // Acciones
  canjearCupon: (id_cupon: number) => { success: boolean; message: string }
  jugarRuleta: () => void
  dismissRuletaResultado: () => void
}

// ─── Helper: generar código único ─────────────────────────────────────────────

function generarCodigo(prefix = 'MTR'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const random = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('')
  return `${prefix}-${random}`
}

// ─── Helper: agregar movimiento al historial ──────────────────────────────────

let _nextMovId = 100

function crearMovimiento(
  tipo: TipoMovimientoPuntosEnum,
  cantidad: number,
  saldoResultante: number,
  justificacion?: string,
): MovimientoPuntos {
  return {
    id_movimiento_punto: _nextMovId++,
    tipo_movimiento: tipo,
    cantidad,
    saldo_puntos_resultante: saldoResultante,
    fecha_movimiento: new Date().toISOString(),
    justificacion: justificacion ?? null,
  }
}

// ─── Datos mock iniciales ─────────────────────────────────────────────────────

const CUPONES_MAESTRO_MOCK: CuponMaestro[] = [
  {
    id_cupon: 1,
    nombre: 'El Clásico Antojo',
    descripcion: 'Descuento del 10% en tu próxima compra. El favorito de nuestra comunidad.',
    porcentaje_descuento: 10,
    costo_puntos: 500,
    dias_vigencia: 30,
    estado: true,
  },
  {
    id_cupon: 2,
    nombre: 'Locura por el Oreo',
    descripcion: 'Cupón especial de 20% para fans de nuestras trufas de Oreo.',
    porcentaje_descuento: 20,
    costo_puntos: 1000,
    dias_vigencia: 15,
    estado: true,
  },
  {
    id_cupon: 3,
    nombre: 'Súper Trufa VIP',
    descripcion: 'El cupón más exclusivo: 30% de descuento para clientes premium.',
    porcentaje_descuento: 30,
    costo_puntos: 1800,
    dias_vigencia: 20,
    estado: true,
  },
  {
    id_cupon: 4,
    nombre: 'Dulce Arranque',
    descripcion: 'Para nuevos pedidos: 15% de descuento en cualquier producto.',
    porcentaje_descuento: 15,
    costo_puntos: 750,
    dias_vigencia: 30,
    estado: true,
  },
]

const CUPONES_CLIENTE_MOCK: CuponCliente[] = [
  {
    id_cupon_cliente: 1,
    codigo_unico: 'MTR-ABCD',
    estado: 'DISPONIBLE',
    origen: 'REGISTRO_NUEVO',
    fecha_adquisicion: '2025-05-10T10:00:00Z',
    fecha_expiracion: '2025-08-10T23:59:00Z',
    fecha_uso: null,
    cupon: {
      id_cupon: 1,
      nombre: 'El Clásico Antojo',
      descripcion: 'Descuento del 10% en tu próxima compra.',
      porcentaje_descuento: 10,
      costo_puntos: 500,
      dias_vigencia: 30,
      estado: true,
    },
  },
  {
    id_cupon_cliente: 2,
    codigo_unico: 'MTR-XY91',
    estado: 'DISPONIBLE',
    origen: 'COMPRA_PUNTOS',
    fecha_adquisicion: '2025-06-01T15:30:00Z',
    fecha_expiracion: '2025-06-16T23:59:00Z',
    fecha_uso: null,
    cupon: {
      id_cupon: 2,
      nombre: 'Locura por el Oreo',
      descripcion: 'Cupón especial de 20% para fans del Oreo.',
      porcentaje_descuento: 20,
      costo_puntos: 1000,
      dias_vigencia: 15,
      estado: true,
    },
  },
]

const HISTORIAL_MOCK: MovimientoPuntos[] = [
  {
    id_movimiento_punto: 1,
    tipo_movimiento: 'ACUMULACION_VENTA',
    cantidad: 1500,
    saldo_puntos_resultante: 1500,
    fecha_movimiento: '2025-05-05T12:00:00Z',
    justificacion: 'Venta #2031 — S/ 150.00',
  },
  {
    id_movimiento_punto: 2,
    tipo_movimiento: 'COMPRA_CUPON',
    cantidad: -1000,
    saldo_puntos_resultante: 500,
    fecha_movimiento: '2025-06-01T15:30:00Z',
    justificacion: 'Canje cupón "Locura por el Oreo"',
  },
  {
    id_movimiento_punto: 3,
    tipo_movimiento: 'ACUMULACION_VENTA',
    cantidad: 2000,
    saldo_puntos_resultante: 2500,
    fecha_movimiento: '2025-06-08T09:15:00Z',
    justificacion: 'Venta #2087 — S/ 200.00',
  },
]

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCriptoTrufaStore = create<CriptoTrufaState>()(
  persist(
    immer((set, get) => ({
      // Estado inicial
      saldoActual: 2500,
      cuponesCliente: CUPONES_CLIENTE_MOCK,
      cuponesMaestro: CUPONES_MAESTRO_MOCK,
      historialMovimientos: HISTORIAL_MOCK,
      ruletaGirando: false,
      ruletaResultado: null,

      // ── Canjear cupón ────────────────────────────────────────────────────────
      canjearCupon: (id_cupon: number) => {
        const state = get()
        const maestro = state.cuponesMaestro.find((c) => c.id_cupon === id_cupon)

        if (!maestro) return { success: false, message: 'Cupón no encontrado.' }
        if (!maestro.costo_puntos) return { success: false, message: 'Cupón no canjeable con puntos.' }
        if (state.saldoActual < maestro.costo_puntos) {
          return {
            success: false,
            message: `Saldo insuficiente. Necesitas ${maestro.costo_puntos} CriptoTrufas, tienes ${state.saldoActual}.`,
          }
        }

        const nuevoCodigo  = generarCodigo('MTR')
        const ahora        = new Date()
        const expiracion   = new Date(ahora)
        expiracion.setDate(expiracion.getDate() + maestro.dias_vigencia)

        const nuevoCupon: CuponCliente = {
          id_cupon_cliente: Date.now(),
          codigo_unico: nuevoCodigo,
          estado: 'DISPONIBLE',
          origen: 'COMPRA_PUNTOS',
          fecha_adquisicion: ahora.toISOString(),
          fecha_expiracion: expiracion.toISOString(),
          fecha_uso: null,
          cupon: maestro,
        }

        const nuevoSaldo = state.saldoActual - maestro.costo_puntos
        const mov = crearMovimiento('COMPRA_CUPON', -maestro.costo_puntos, nuevoSaldo, `Canje cupón "${maestro.nombre}"`)

        set((s) => {
          s.saldoActual = nuevoSaldo
          s.cuponesCliente.push(nuevoCupon)
          s.historialMovimientos.unshift(mov)
        })

        return { success: true, message: `¡Cupón ${nuevoCodigo} canjeado exitosamente!` }
      },

      // ── Ruleta ───────────────────────────────────────────────────────────────
      jugarRuleta: () => {
        const COSTO_JUEGO = 50
        const state = get()

        if (state.ruletaGirando) return
        if (state.saldoActual < COSTO_JUEGO) return

        // Debitar el costo inmediatamente
        const saldoTrasPago = state.saldoActual - COSTO_JUEGO
        const movPago = crearMovimiento('PAGO_JUEGO', -COSTO_JUEGO, saldoTrasPago, 'Jugada en Ruleta Dulce')

        set((s) => {
          s.saldoActual = saldoTrasPago
          s.ruletaGirando = true
          s.ruletaResultado = null
          s.historialMovimientos.unshift(movPago)
        })

        // Simular latencia del servidor (2 segundos)
        setTimeout(() => {
          const rand = Math.random()
          let resultado: RuletaResultado
          const saldoActual = get().saldoActual

          if (rand < 0.50) {
            // 50% — Mala suerte
            resultado = {
              tipo: 'mala_suerte',
              mensaje: '¡Mala suerte! Sigue intentando. 🍀',
              puntosGanados: 0,
            }
            set((s) => { s.ruletaResultado = resultado; s.ruletaGirando = false })
          } else if (rand < 0.80) {
            // 30% — 100 puntos extra
            const premiosPts = 100
            const nuevoSaldo = saldoActual + premiosPts
            const movPremio  = crearMovimiento('PREMIO_JUEGO', premiosPts, nuevoSaldo, 'Premio Ruleta: 100 puntos')
            resultado = {
              tipo: 'puntos_extra',
              mensaje: '¡Ganaste 100 CriptoTrufas extra! 🎉',
              puntosGanados: premiosPts,
            }
            set((s) => {
              s.saldoActual = nuevoSaldo
              s.historialMovimientos.unshift(movPremio)
              s.ruletaResultado = resultado
              s.ruletaGirando = false
            })
          } else {
            // 20% — Cupón sorpresa 30%
            const cuponSorpresaMaestro: CuponMaestro = {
              id_cupon: 99,
              nombre: 'Cupón Sorpresa Ruleta',
              descripcion: '¡Premio de la Ruleta Dulce! 30% de descuento.',
              porcentaje_descuento: 30,
              costo_puntos: null,
              dias_vigencia: 7,
              estado: true,
            }
            const ahora = new Date()
            const exp   = new Date(ahora)
            exp.setDate(exp.getDate() + 7)

            const cuponGanado: CuponCliente = {
              id_cupon_cliente: Date.now(),
              codigo_unico: generarCodigo('WIN'),
              estado: 'DISPONIBLE',
              origen: 'PREMIO_JUEGO',
              fecha_adquisicion: ahora.toISOString(),
              fecha_expiracion: exp.toISOString(),
              fecha_uso: null,
              cupon: cuponSorpresaMaestro,
            }
            resultado = {
              tipo: 'cupon_sorpresa',
              mensaje: `¡Premio Mayor! Cupón ${cuponGanado.codigo_unico} — 30% OFF 🏆`,
              puntosGanados: 0,
            }
            set((s) => {
              s.cuponesCliente.push(cuponGanado)
              s.ruletaResultado = resultado
              s.ruletaGirando = false
            })
          }
        }, 2000)
      },

      // ── Dismiss resultado de ruleta ───────────────────────────────────────────
      dismissRuletaResultado: () => {
        set((s) => { s.ruletaResultado = null })
      },
    })),
    {
      name: 'mitrufely-criptotrufa',
      // Solo persistir datos esenciales, no UI state
      partialize: (state) => ({
        saldoActual: state.saldoActual,
        cuponesCliente: state.cuponesCliente,
        historialMovimientos: state.historialMovimientos,
      }),
    },
  ),
)
