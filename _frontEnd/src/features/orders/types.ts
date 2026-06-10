export interface DetalleVentaResponse {
  id_detalle: number
  id_venta: number
  id_producto: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  nombre?: string | null
  imagen_url?: string | null
  nombre_producto?: string | null
  imagen_url_producto?: string | null
}

export interface DocumentoResponse {
  id_documento: number
  id_venta: number
  tipo_documento: 'BOLETA' | 'FACTURA' | 'REPORTE'
  numero_serie: string | null
  numero_correlativo: string | null
  url_archivo: string | null
  fecha_generacion: string
}

export interface MetodoPagoResponse {
  id_pago: number
  id_venta: number
  tipo_pago: 'TARJETA'
  monto: number
  codigo_transaccion: string | null
  proveedor: string | null
  estado_transaccion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'ANULADO'
  fecha_pago: string
}

export interface VentaPaqueteResponse {
  id_venta_paquete: number
  id_venta: number
  id_paquete: number
  cantidad: number
  nombre_paquete_snapshot: string
  composicion_snapshot_json: Record<string, any>
  fecha_registro: string
}

export interface VentaResponse {
  id_venta: number
  id_cliente: number
  estado: 'PENDIENTE' | 'PAGADO' | 'ENTREGADO' | 'ANULADO'
  estado_pago: 'PENDIENTE' | 'PAGADO'
  total: number
  puntos_ganados: number
  fecha_venta: string
  
  // Campos de desglose
  subtotal_productos?: number | null
  costo_envio?: number | null
  monto_descuento_cupon?: number | null
  base_imponible?: number | null
  igv?: number | null
  
  // Relaciones
  detalles?: DetalleVentaResponse[] | null
  paquetes_vendidos?: VentaPaqueteResponse[] | null
  metodos_pago?: MetodoPagoResponse[] | null
  documentos?: DocumentoResponse[] | null
}
