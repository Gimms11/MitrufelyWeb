from datetime import datetime
from decimal import Decimal
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    page: int
    size: int
    total: int
    pages: int


# ── Productos ─────────────────────────────────────────────────────────────────

class ProductoBase(BaseModel):
    id_categoria: Optional[int] = None
    nombre: str = Field(..., max_length=150)
    descripcion: Optional[str] = None
    ingredientes: Optional[str] = None
    alergenos: Optional[str] = Field(None, max_length=255)
    peso_gramos: Optional[Decimal] = Field(None, gt=0)
    precio: Decimal = Field(..., ge=0)
    stock_minimo: int = Field(0, ge=0)
    imagen_url: Optional[str] = Field(None, max_length=255)
    estado: bool = True

class ProductoCreate(ProductoBase):
    pass

class ProductoUpdate(ProductoBase):
    nombre: Optional[str] = Field(None, max_length=150)
    precio: Optional[Decimal] = Field(None, ge=0)
    stock_minimo: Optional[int] = Field(None, ge=0)
    estado: Optional[bool] = None

class ProductoResponse(ProductoBase):
    id_producto: int
    slug: str
    stock_actual: int
    cloudinary_public_id: Optional[str] = None
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    disponible: bool = True
    
    model_config = ConfigDict(from_attributes=True)


# ── Paquetes ──────────────────────────────────────────────────────────────────

class PaqueteProductoBase(BaseModel):
    id_producto: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)

class PaqueteProductoCreate(PaqueteProductoBase):
    pass

class PaqueteProductoResponse(PaqueteProductoBase):
    id_paquete_producto: int
    id_paquete: int
    
    model_config = ConfigDict(from_attributes=True)

class PaqueteBase(BaseModel):
    nombre: str = Field(..., max_length=150)
    slug: str = Field(..., max_length=150)
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = Field(None, max_length=255)
    cloudinary_public_id: Optional[str] = Field(None, max_length=255)
    estado: bool = True

class PaqueteCreate(PaqueteBase):
    productos: List[PaqueteProductoCreate] = Field(..., min_length=2, description="Debe contener mínimo 2 productos distintos")
    
    @field_validator('productos')
    def validate_unique_products(cls, v):
        product_ids = [p.id_producto for p in v]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError('Los productos dentro de un paquete no pueden repetirse')
        return v

class PaqueteUpdate(PaqueteBase):
    nombre: Optional[str] = Field(None, max_length=150)
    slug: Optional[str] = Field(None, max_length=150)
    estado: Optional[bool] = None
    productos: Optional[List[PaqueteProductoCreate]] = Field(None, min_length=2)
    
    @field_validator('productos')
    def validate_unique_products(cls, v):
        if v is not None:
            product_ids = [p.id_producto for p in v]
            if len(product_ids) != len(set(product_ids)):
                raise ValueError('Los productos dentro de un paquete no pueden repetirse')
        return v

class PaqueteResponse(PaqueteBase):
    id_paquete: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    productos: List[PaqueteProductoResponse]
    disponible: bool = True # Calculado dinámicamente según stock
    precio: Decimal = Field(default=0, ge=0) # Suma de precios de componentes
    
    model_config = ConfigDict(from_attributes=True)
