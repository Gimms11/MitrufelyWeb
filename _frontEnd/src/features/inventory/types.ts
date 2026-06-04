export type EstadoLote = 'VIGENTE' | 'AGOTADO' | 'VENCIDO'

export type TipoMovimientoStock =
  | 'INGRESO_COMPRA'
  | 'VENTA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'MERMA'
  | 'VENCIMIENTO'
  | 'DEVOLUCION'

export interface Lote {
  id_lote: number
  id_producto: number
  fecha_ingreso: string
  fecha_vencimiento: string | null
  cantidad_inicial: number
  cantidad_disponible: number
  estado_lote: EstadoLote
  producto?: {
    id_producto: number
    nombre: string
  }
}

export interface MovimientoStock {
  id_movimiento_stock: number
  id_producto: number
  id_lote: number | null
  id_venta: number | null
  id_usuario: number | null
  tipo_movimiento: TipoMovimientoStock
  cantidad: number
  stock_resultante: number
  costo_unitario: string | null // backend returns decimal as string or number
  fecha_movimiento: string
  observacion: string | null
}

export interface ReconciliationItem {
  id_producto: number
  nombre: string
  stock_actual: number
  stock_calculado_kardex: number
  stock_calculado_lotes: number
  descuadrado: boolean
}

export interface NextLotResponse {
  id_lote: number
  id_producto: number
  fecha_vencimiento: string | null
  cantidad_disponible: number
  dias_restantes: number | null
}
