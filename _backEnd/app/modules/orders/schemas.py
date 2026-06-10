from datetime import datetime
from decimal import Decimal
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.infrastructure.database.models.enums import OrigenVentaEnum, TipoPagoEnum

# ── Ítem de Venta ─────────────────────────────────────────────────────────────


class ItemProducto(BaseModel):
    id_producto: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)


class ItemPaquete(BaseModel):
    id_paquete: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)


# ── Petición de Checkout (VentaRequest) ───────────────────────────────────────


class VentaRequest(BaseModel):
    """Payload para crear una nueva venta desde el carrito de compras."""

    origen_venta: OrigenVentaEnum = OrigenVentaEnum.WEB
    id_cupon_cliente: Optional[int] = None
    productos: Optional[List[ItemProducto]] = Field(default_factory=list)
    paquetes: Optional[List[ItemPaquete]] = Field(default_factory=list)

    # Datos del pago inicial
    tipo_pago: TipoPagoEnum = TipoPagoEnum.TARJETA
    # Aquí vendría token de tarjeta de pasarela de pago u otros

    def has_items(self) -> bool:
        return len(self.productos) > 0 or len(self.paquetes) > 0


# ── Respuesta de Venta ────────────────────────────────────────────────────────


class DetalleVentaResponse(BaseModel):
    id_detalle: Optional[int] = None
    id_venta: Optional[int] = None
    id_producto: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal
    nombre_producto: Optional[str] = None
    imagen_url_producto: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def extract_from_producto(cls, data: Any) -> Any:
        if hasattr(data, "producto") and data.producto:
            producto = data.producto
            object.__setattr__(data, "nombre_producto", producto.nombre)
            object.__setattr__(data, "imagen_url_producto", producto.imagen_url or "")
        return data

    model_config = ConfigDict(from_attributes=True)


class DocumentoResponse(BaseModel):
    id_documento: Optional[int] = None
    id_venta: Optional[int] = None
    tipo_documento: str
    numero_serie: Optional[str] = None
    numero_correlativo: Optional[str] = None
    url_archivo: Optional[str] = None
    fecha_generacion: datetime

    model_config = ConfigDict(from_attributes=True)


class MetodoPagoResponse(BaseModel):
    id_pago: Optional[int] = None
    id_venta: Optional[int] = None
    tipo_pago: str
    monto: Decimal
    codigo_transaccion: Optional[str] = None
    proveedor: Optional[str] = None
    estado_transaccion: str
    fecha_pago: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class VentaPaqueteResponse(BaseModel):
    id_venta_paquete: Optional[int] = None
    id_venta: Optional[int] = None
    id_paquete: int
    cantidad: int
    nombre_paquete_snapshot: str
    composicion_snapshot_json: Any
    fecha_registro: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class VentaResponse(BaseModel):
    id_venta: Optional[int] = None
    id_cliente: int
    estado: str
    estado_pago: str
    total: Decimal
    puntos_ganados: int
    fecha_venta: Optional[datetime] = None

    # Campos de desglose
    subtotal_productos: Optional[Decimal] = None
    costo_envio: Optional[Decimal] = None
    monto_descuento_cupon: Optional[Decimal] = None
    base_imponible: Optional[Decimal] = None
    igv: Optional[Decimal] = None

    # Relaciones cargadas
    detalles: Optional[List[DetalleVentaResponse]] = None
    paquetes_vendidos: Optional[List[VentaPaqueteResponse]] = None
    metodos_pago: Optional[List[MetodoPagoResponse]] = None
    documentos: Optional[List[DocumentoResponse]] = None

    model_config = ConfigDict(from_attributes=True)
