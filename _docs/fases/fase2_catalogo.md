# Fase 2: Catálogo de Productos y Paquetes Comerciales

> **Estado:** ✅ Backend implementado y verificado con tests.
> **Última revisión:** 2026-05-31

---

## 1. Visión General

Esta fase implementa el módulo de **Catálogo y Paquetes Comerciales** de Mytrufely, integrando tanto los **Productos** (unidades físicas) como los **Paquetes** (agrupaciones comerciales). Establece la separación arquitectónica fundamental entre el catálogo comercial (paquetes) y el inventario físico (lotes y FEFO).

**Principios de diseño clave:**
- **Productos:** Son la base física. Tienen stock controlado por NeonDB (FEFO y Kardex), soporte de imágenes alojadas en Cloudinary, paginación, y disponibilidad dependiente del `stock_actual` y `estado`.
- **Paquetes:** Son **entidades comerciales reutilizables**. No son unidades físicas. No poseen stock propio, ni lotes, ni participan directamente en FEFO ni generan movimientos de Kardex. Cuando se vende un paquete, el backend lo expande en sus componentes y los inserta en `detalles_venta`, punto donde NeonDB toma el control con sus triggers.


---

## 2. Modelos de Base de Datos (ORM)

Basados en `M03_catalogo_inventario.sql`. Todos los modelos están registrados en `app/infrastructure/database/models/__init__.py`.

### Tablas del Catálogo

| Tabla | ORM Python | Propósito |
|---|---|---|
| `productos` | `Producto` | Catálogo de productos físicos |
| `paquetes` | `Paquete` | Definición comercial del combo/caja |
| `paquete_productos` | `PaqueteProducto` | Relación N:M paquete ↔ producto (con cantidad) |
| `venta_paquetes` | `VentaPaquete` | Trazabilidad comercial: snapshot histórico de qué paquetes se vendieron |

### Campos ORM `Producto`

```python
class Producto(Base):
    id_producto: int (PK)
    id_categoria: int | None (FK → categorias)
    nombre: str           # único entre activos, max 150
    slug: str             # único, autogenerado (ej. trufa-oreo-2)
    descripcion: str | None
    ingredientes: str | None
    alergenos: str | None
    peso_gramos: Decimal | None
    precio: Decimal       # > 0
    stock_actual: int     # calculado por DB
    stock_minimo: int
    imagen_url: str | None
    cloudinary_public_id: str | None
    estado: bool          # Soft delete (True=activo)
    fecha_creacion: datetime
    fecha_actualizacion: datetime
```

### Campos ORM `Paquete`

```python
class Paquete(Base):
    id_paquete: int (PK)
    nombre: str           # único, max 150
    slug: str             # único, generado automáticamente
    descripcion: str | None
    imagen_url: str | None
    cloudinary_public_id: str | None  # ID público para reemplazos/borrados en Cloudinary
    estado: bool          # True = activo/publicado
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    productos: list[PaqueteProducto]  # relación lazy + selectinload
```

### Campos ORM `PaqueteProducto` (Asociación)

```python
class PaqueteProducto(Base):
    id_paquete_producto: int (PK)
    id_paquete: int (FK → paquetes)
    id_producto: int (FK → productos)
    cantidad: int         # unidades de este producto en el paquete (CHECK cantidad >= 1)
    producto: Producto    # relación backref
```

### Campos ORM `VentaPaquete` (Trazabilidad)

```python
class VentaPaquete(Base):
    id_venta_paquete: int (PK)
    id_venta: int (FK → ventas)
    id_paquete: int (FK → paquetes)
    cantidad: int
    nombre_paquete_snapshot: str      # nombre al momento de la venta
    composicion_snapshot_json: JSON   # [{id_producto, nombre, cantidad, precio_unitario}]
    fecha_registro: datetime
```

> **Importante:** `composicion_snapshot_json` guarda la composición en el momento exacto de la venta. Si un admin cambia el paquete después, el historial queda intacto.

---

## 3. Arquitectura del Módulo `products/`

```
app/modules/products/
├── router.py          # FastAPI: /api/v1/packages endpoints
├── service.py         # PaqueteService — lógica de negocio pura
├── repository.py      # IPaqueteRepository (interface abstracta)
├── repository_impl.py # PaqueteRepositoryImpl (SQLAlchemy)
├── schemas.py         # Pydantic: PaqueteCreate, PaqueteResponse, etc.
└── dependencies.py    # DI: get_paquete_repository, get_paquete_service
```

### Inyección de Dependencias

```python
# orders/dependencies.py — VentaService necesita PaqueteRepository
def get_venta_service(
    repo: VentaRepositoryImpl = Depends(get_venta_repository),
    paquete_repo: PaqueteRepositoryImpl = Depends(get_paquete_repository),
    session: AsyncSession = Depends(get_db_session),
) -> VentaService:
    return VentaService(repo, paquete_repo, session)
```

---

## 4. Lógica de Negocio: `PaqueteService`

### 4.1. Precio Dinámico

El paquete **no tiene precio almacenado** en la BD. El precio se calcula en cada request sumando `precio_unitario × cantidad` de cada componente:

```python
def _calc_precio(self, paquete: Paquete) -> Decimal:
    return sum(
        pp.producto.precio * pp.cantidad
        for pp in paquete.productos
    )
```

### 4.2. Disponibilidad Dinámica

El campo `disponible` se evalúa en tiempo real. Un paquete es disponible **solo si todos sus componentes** tienen `estado=True` y `stock_actual >= cantidad_requerida`.

```python
def _calc_disponible(self, paquete: Paquete) -> bool:
    return all(
        pp.producto.estado and pp.producto.stock_actual >= pp.cantidad
        for pp in paquete.productos
    )
```

> **Regla de negocio:** Si el stock de cualquier componente llega a cero, el paquete desaparece automáticamente del catálogo público sin ninguna intervención del admin.

### 4.3. get_all (Público vs Admin)

| Método | Filtro | Uso |
|---|---|---|
| `get_all(limit, offset)` | Solo devuelve `disponible=True` | Catálogo público y frontend |
| `get_all_admin(limit, offset)` | Devuelve todos (sin filtrar) | Panel de administración |

---

## 5. Lógica de Checkout con Paquetes (`VentaService`)

### 5.1. Flujo Completo

```
POST /api/v1/orders/checkout
    │
    ├─ 1. Validar carrito no vacío (→ 400)
    │
    ├─ 2. Procesar productos individuales:
    │      SELECT Producto WHERE id = item.id_producto
    │      Validar: existe (→ 404), activo (→ 400), stock (→ 400)
    │      Append DetalleVenta al objeto Venta
    │
    ├─ 3. Procesar paquetes:
    │      GET paquete + productos (selectinload)
    │      Validar: existe (→ 400), activo (→ 400)
    │      Por cada componente: validar stock (→ 400)
    │      EXPANSION → Append DetalleVenta por componente
    │      Append VentaPaquete (snapshot comercial)
    │
    ├─ 4. Calcular totales:
    │      subtotal_productos = Σ (precio × cantidad)
    │      total = subtotal_productos   ← IGV ya incluido en precio catálogo
    │
    ├─ 5. Append MetodoPago (solo TARJETA)
    │
    └─ 6. session.commit()
           → Trigger NeonDB: tg_detalles_venta_asignar_lotes (FEFO)
           → Trigger NeonDB: tg_movimientos_stock (Kardex)
```

### 5.2. La Expansión de Paquetes

```python
# Cada componente del paquete se inserta en detalles_venta
for pp in paquete_db.productos:
    nueva_venta.detalles.append(
        DetalleVenta(
            id_producto=pp.id_producto,
            cantidad=pp.cantidad * item.cantidad,   # escala por cantidad de paquetes
            precio_unitario=pp.producto.precio,
            subtotal=pp.producto.precio * pp.cantidad * item.cantidad,
        )
    )
# Y se registra la trazabilidad comercial
nueva_venta.paquetes_vendidos.append(
    VentaPaquete(
        id_paquete=paquete_db.id_paquete,
        cantidad=item.cantidad,
        nombre_paquete_snapshot=paquete_db.nombre,
        composicion_snapshot_json=composicion_snapshot,  # lista serializable
    )
)
```

> **Los triggers de NeonDB son los responsables de FEFO, Kardex y actualización de `stock_actual`. El backend solo inserta `detalles_venta`.**

---

## 6. Schemas Pydantic de Referencia

### Request (Creación)

```python
class PaqueteProductoCreate(BaseModel):
    id_producto: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)

class PaqueteCreate(BaseModel):
    nombre: str = Field(..., max_length=150)
    slug: str = Field(..., max_length=150)
    descripcion: str | None = None
    imagen_url: str | None = None
    productos: list[PaqueteProductoCreate] = Field(..., min_length=2)

    @field_validator('productos')
    def validate_unique_products(cls, v):
        ids = [p.id_producto for p in v]
        if len(ids) != len(set(ids)):
            raise ValueError('No pueden repetirse productos dentro de un paquete')
        return v
```

### Response (Pública)

```python
class PaqueteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id_paquete: int
    nombre: str
    slug: str
    descripcion: str | None
    imagen_url: str | None
    estado: bool
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    productos: list[PaqueteProductoResponse]
    disponible: bool        # calculado dinámicamente
    precio: Decimal         # calculado dinámicamente (suma de componentes)
```

### VentaRequest (Checkout)

```python
class ItemProducto(BaseModel):
    id_producto: int
    cantidad: int = Field(..., gt=0)

class ItemPaquete(BaseModel):
    id_paquete: int
    cantidad: int = Field(..., gt=0)

class VentaRequest(BaseModel):
    productos: list[ItemProducto] = []
    paquetes: list[ItemPaquete] = []
    tipo_pago: TipoPagoEnum        # Solo TARJETA
    id_cupon_cliente: int | None = None
    origen_venta: OrigenVentaEnum = OrigenVentaEnum.WEB

    def has_items(self) -> bool:
        return bool(self.productos or self.paquetes)
```

---

## 7. Endpoints de la API

### Packages (`/api/v1/packages`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/` | Público | Lista paginada. Filtra dinámicamente (`disponible=True`) |
| `GET` | `/admin` | `ADMIN` | Lista todos los paquetes sin filtrar |
| `GET` | `/{id}` | Público | Detalle con precio y disponibilidad calculados |
| `POST` | `/` | `ADMIN` | Crear paquete (`multipart/form-data` con archivo `image` y rollback en Cloudinary) |
| `PUT` | `/{id}` | `ADMIN` | Actualizar paquete (`multipart/form-data` con reemplazo seguro de imagen) |
| `DELETE` | `/{id}` | `ADMIN` | Soft delete (cambia `estado=False`, conserva imagen en Cloudinary) |

### Products (`/api/v1/products`) [NUEVO]

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/` | Público | `PaginatedResponse` con productos `estado=True` y `stock_actual > 0`. Filtros: `search`, `categoria`, `sort`. |
| `GET` | `/admin` | `ADMIN` | `PaginatedResponse` sin filtros automáticos. |
| `GET` | `/{id}` | Público | Detalle de un producto. |
| `POST` | `/` | `ADMIN` | Crear producto (`multipart/form-data` con imagen opcional, auto-slug, rollback Cloudinary). Da `409` si nombre activo duplicado. |
| `PUT` | `/{id}` | `ADMIN` | Actualizar producto (`multipart/form-data` con reemplazo Cloudinary). |
| `DELETE` | `/{id}` | `ADMIN` | Soft delete (cambia `estado=False`). Invalida automáticamente paquetes que lo contienen. |

### Storage (`/api/v1/storage`) [NUEVO]

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/upload` | `ADMIN` | Subir imagen general optimizada (WYSIWYG, Banners, CMS) |

> **Nota de enrutado:** `/admin` está definido **antes** de `/{id}` en el router para evitar que FastAPI interprete la cadena `"admin"` como un entero de ID.

---

## 8. Reglas de Negocio Implementadas

| Regla | Donde se aplica |
|---|---|
| Paquete requiere mínimo 2 productos distintos | `PaqueteCreate.validate_unique_products()` |
| Paquete no disponible si componente sin stock | `PaqueteService._calc_disponible()` |
| Precio del paquete = suma de componentes (dinámico) | `PaqueteService._calc_precio()` |
| El cliente no puede comprar paquete agotado | `VentaService.create_checkout()` |
| Stock insuficiente en componente bloquea compra | `VentaService.create_checkout()` |
| FEFO y Kardex solo aplican sobre productos físicos | Triggers NeonDB (post-INSERT detalles_venta) |
| El pago es únicamente con `TARJETA` | `TipoPagoEnum` in `VentaRequest` |
| El snapshot de composición se guarda en `venta_paquetes` | `VentaService.create_checkout()` |
| Límite de tamaño de subida a 5MB | `CloudinaryService.upload_image()` |
| Doble validación MIME (`image/*`) + cabecera Pillow | `CloudinaryService._optimize_image()` |
| Preservación del canal de transparencias Alpha (RGBA) | `CloudinaryService._optimize_image()` |
| Rollback asíncrono en Cloudinary si falla BD | `PaqueteService.create_with_image()` |
| Reemplazo activo de imagen antigua tras commit exitoso | `PaqueteService.update_with_image()` |
| Mock Mode deshabilitado estrictamente en producción | `CloudinaryService.__init__()` |
| Constraints físicos de base de datos en modelos ORM | `CheckConstraint` en `Producto` y `PaqueteProducto` |

---

## 9. Estado de Implementación

| Componente | Estado |
|---|---|
| ORM Models (`Producto`, `Paquete`, `PaqueteProducto`, `VentaPaquete`) | ✅ Implementado |
| Models registrados en `models/__init__.py` | ✅ Implementado |
| `ProductoRepositoryImpl` / `PaqueteRepositoryImpl` (SQLAlchemy) | ✅ Implementado |
| `ProductoService` / `PaqueteService` (precio dinámico, disponibilidad) | ✅ Implementado |
| Router `/api/v1/packages` y `/api/v1/products` | ✅ Implementado |
| `VentaService.create_checkout` (productos + paquetes) | ✅ Implementado |
| Tests unitarios `test_paquete_service.py` y `test_producto_service.py` | ✅ Implementado |
| Tests unitarios `test_venta_service.py` | ✅ Implementado |
| Tests E2E `test_packages_api.py` y `test_productos_api.py` | ✅ Implementado |
| Gestión de imágenes y optimización Cloudinary (Pillow) | ✅ Implementado (Fase 2) |
| Tests unitarios y rollback `test_storage_service.py` | ✅ Implementado (Fase 2) |
| Frontend: Vitrina de paquetes y productos | ✅ En Progreso |

---

## 10. Bugs Críticos Corregidos en Esta Fase

| Bug | Archivo | Fix Aplicado |
|---|---|---|
| `NameError: Decimal` no importado | `products/service.py` | `from decimal import Decimal` |
| `Paquete`, `PaqueteProducto`, `VentaPaquete` no registrados en SQLAlchemy | `models/__init__.py` | Añadidos al aggregator |
| Checkout de productos individuales era stub vacío | `orders/service.py` | Implementación completa con validaciones |
| Asignaciones a `igv`/`base_imponible` sin columnas ORM | `orders/service.py` | Eliminadas (IGV incluido en precio catálogo) |
