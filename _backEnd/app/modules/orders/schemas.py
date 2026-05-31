from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

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

class VentaResponse(BaseModel):
    id_venta: int
    id_cliente: int
    estado: str
    estado_pago: str
    total: Decimal
    puntos_ganados: int
    fecha_venta: datetime
    
    model_config = ConfigDict(from_attributes=True)
