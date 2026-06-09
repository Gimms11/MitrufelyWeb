# Fase 4: Carrito, Checkout Transaccional y Ventas

> **Estado:** ✅ Backend implementado y verificado con 50 tests.
> **Última revisión:** 2026-06-09

---

## 1. Visión General

Esta fase implementa el flujo completo de compra: desde el carrito persistente en Redis hasta la generación automática de comprobantes, pasando por el checkout transaccional con integración FEFO y Kardex.

**Principios de diseño clave:**
- **Carrito:** Persistente en Redis (`cart:{user_id}`), TTL de 7 días con sliding expiration, sincronizable con el frontend vía Zustand.
- **Checkout:** Transacción única con `session.begin()`. Las validaciones pre-transaccionales son fast-fail (lecturas sin lock). La integridad del stock la garantiza PostgreSQL con `FOR UPDATE` en el trigger `tg_detalles_venta_asignar_lotes`.
- **Sin pasarelas de pago:** Por alcance universitario, no se integran Culqi, Izipay ni MercadoPago. La venta se crea como `PENDIENTE`/`PENDIENTE` y un admin puede marcarla como `PAGADA` vía `PUT /ventas/{id}/pagar`.
- **Documento automático:** Cada checkout genera un `Documento` (BOLETA por defecto) en la misma transacción.
- **Expiración automática:** Celery ejecuta cada 5 minutos `expire_pending` para anular ventas PENDIENTE con más de 15 minutos sin pagar.

---

## 2. Modelos de Base de Datos (ORM)

Basados en `M05_ventas_pagos.sql`. Todos los modelos están registrados en `app/infrastructure/database/models/__init__.py`.

### Tablas del Módulo de Ventas

| Tabla | ORM Python | Propósito |
|---|---|---|
| `ventas` | `Venta` | Cabecera de la orden de venta |
| `detalles_venta` | `DetalleVenta` | Líneas de producto (individuales o expandidos de paquete) |
| `venta_paquetes` | `VentaPaquete` | Trazabilidad comercial: snapshot del paquete vendido |
| `detalle_venta_lotes` | `DetalleVentaLotes` | Traza física FEFO (gestionado por trigger) |
| `metodos_pago` | `MetodoPago` | Registro del pago asociado |
| `documentos` | `Documento` | Boleta o factura emitida |
| `historial_estados_venta` | `HistorialEstadosVenta` | Auditoría de cambios de estado (trigger) |

### Campos ORM `Venta`

```python
class Venta(Base):
    id_venta: int (PK)
    id_cliente: int (FK → clientes)
    id_cupon_cliente: int | None (FK → cupones_cliente, UNIQUE)
    origen_venta: OrigenVentaEnum  # Solo WEB
    estado: EstadoVentaEnum        # PENDIENTE | PAGADO | ENTREGADO | ANULADO
    estado_pago: EstadoPagoEnum    # PENDIENTE | PAGADO
    subtotal_productos: Decimal
    costo_envio: Decimal
    monto_descuento_cupon: Decimal
    base_imponible: Decimal        # subtotal / 1.18
    igv: Decimal                   # 18% del subtotal
    total: Decimal                 # subtotal_productos (IGV ya incluido en precio catálogo)
    puntos_ganados: int
    fecha_venta: datetime
```

### Campos ORM `Documento`

```python
class Documento(Base):
    id_documento: int (PK)
    id_venta: int (FK → ventas)
    tipo_documento: TipoDocumentoVentaEnum  # BOLETA | FACTURA | REPORTE
    numero_serie: str | None               # Pendiente de implementar
    numero_correlativo: str | None         # Pendiente de implementar
    url_archivo: str | None                # PDF (pendiente)
    fecha_generacion: datetime
```

> **Nota:** `numero_serie` y `numero_correlativo` quedan `None` en la implementación actual. La tabla `contadores_documentos` y la lógica de autoincremento están pendientes (no bloquean el flujo académico).

### Campos ORM `MetodoPago`

```python
class MetodoPago(Base):
    id_pago: int (PK)
    id_venta: int (FK → ventas)
    tipo_pago: TipoPagoEnum        # Solo TARJETA
    monto: Decimal
    codigo_transaccion: str | None
    proveedor: str | None
    estado_transaccion: EstadoTransaccionEnum  # PENDIENTE | APROBADO | RECHAZADO | ANULADO
    fecha_pago: datetime
```

---

## 3. Arquitectura del Módulo `cart/`

```
app/modules/cart/
├── __init__.py
├── schemas.py         # AddCartItemRequest, UpdateCartItemRequest, CartResponse, CartCheckoutResponse
├── service.py         # CartService — operaciones Redis puras
├── router.py          # 5 endpoints REST bajo /api/v1/cart
└── dependencies.py    # DI: get_cart_service(Redis) → CartService
```

### Redis: Cliente

```python
# app/infrastructure/cache/redis_client.py
redis_client: Redis = from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

async def get_redis() -> Redis:
    return redis_client
```

### Redis: Carrito

| Propiedad | Valor |
|-----------|-------|
| Key pattern | `cart:{user_id}` |
| Formato | JSON string |
| TTL | 604800 segundos (7 días) |
| Sliding TTL | Sí — cada `setex` renueva el TTL |
| Serialización | `json.dumps` / `json.loads` con Decimal → string |

### CartService — Métodos

| Método | Descripción |
|--------|-------------|
| `get_cart(user_id)` | Lee de Redis, deserializa, retorna `CartResponse` |
| `add_item(user_id, nombre, precio, item)` | Agrega o acumula item, persiste con TTL renovado |
| `update_item(user_id, id_producto, payload)` | Actualiza cantidad de un item |
| `remove_item(user_id, id_producto)` | Elimina item del carrito |
| `clear_cart(user_id)` | Elimina la key completa de Redis |

### Flujo del Checkout desde Carrito

```
POST /api/v1/ventas/checkout/cart
  │
  ├─ 1. CartService.get_cart(user_id)        → lee Redis
  ├─ 2. Validar cart.items (→ error si vacío)
  ├─ 3. Transformar cart → VentaRequest
  │      productos = [i for i if not i.es_paquete]
  │      paquetes  = [i for i if i.es_paquete]
  ├─ 4. VentaService.create_checkout(dto)
  │      └─ Pre-validación → session.begin() → flush (triggers FEFO/Kardex) → Documento
  ├─ 5. CartService.clear_cart(user_id)      → elimina key Redis
  └─ 6. Retornar CartCheckoutResponse { id_venta, total, estado, estado_pago }
```

---

## 4. Arquitectura del Módulo `orders/`

```
app/modules/orders/
├── router.py          # 5 endpoints bajo /api/v1/ventas
├── service.py         # VentaService — lógica de negocio transaccional
├── repository.py      # IVentaRepository (interfaz abstracta)
├── repository_impl.py # VentaRepositoryImpl (SQLAlchemy)
├── schemas.py         # VentaRequest, VentaResponse, ItemProducto, ItemPaquete
└── dependencies.py    # DI: get_venta_service
```

### Inyección de Dependencias

```python
# orders/dependencies.py
def get_venta_service(
    repo: VentaRepositoryImpl = Depends(get_venta_repository),
    paquete_repo: PaqueteRepositoryImpl = Depends(get_paquete_repository),
    session: AsyncSession = Depends(get_db_session),
) -> VentaService:
    return VentaService(repo, paquete_repo, session)
```

> **Nota:** El service usa `self.session` directamente para operaciones DB. El repo (`VentaRepositoryImpl`) se usa para consultas (`get_by_id`, `find_by_cliente`). Esto es una decisión arquitectónica consciente: el checkout usa la sesión directamente para construir el grafo de objetos en memoria, mientras que las consultas delegan al repositorio.

### Lógica de Negocio: `VentaService`

| Método | Descripción |
|--------|-------------|
| `create_checkout(id_cliente, dto, tipo_documento=BOLETA)` | Flujo transaccional completo: validación → expansión de paquetes → cálculo fiscal → `session.begin()` → triggers FEFO → Documento |
| `confirmar_pago(id_venta)` | Marca venta como PAGADA. Dispara `tg_ventas_otorgar_puntos` |
| `get_by_id(id_venta)` | Consulta por ID |
| `get_all(limit, offset)` | Lista paginada |
| `get_by_cliente(id_cliente, limit, offset)` | Ventas de un cliente, orden descendente por fecha |

### Flujo Transaccional del Checkout (detallado)

```
VentaService.create_checkout()
  │
  ├─ 1. Validar has_items() → BusinessRuleError si vacío
  │
  ├─ 2. Procesar productos (dto.productos):
  │      SELECT Producto WHERE id = item.id_producto            ← SIN lock
  │      Validar: existe (→ NotFoundError), activo (→ BusinessRuleError),
  │              stock >= cantidad (→ InsufficientStockError)
  │      Append DetalleVenta al grafo en memoria
  │
  ├─ 3. Procesar paquetes (dto.paquetes):
  │      GET paquete + productos (selectinload anidado)
  │      Validar: existe + activo (→ BusinessRuleError)
  │      Por componente: validar stock (→ InsufficientStockError)
  │      EXPANSIÓN: Append DetalleVenta por componente
  │      Snapshot: Append VentaPaquete (JSONB inmutable)
  │
  ├─ 4. Cálculos fiscales:
  │      base_imponible = subtotal / 1.18
  │      igv = subtotal - base_imponible
  │      total = subtotal
  │
  ├─ 5. Append MetodoPago(estado_transaccion=PENDIENTE)
  │
  ├─ 6. async with self.session.begin():
  │      │
  │      ├─ session.add(nueva_venta) + flush
  │      │  └──► tg_detalles_venta_asignar_lotes  (FEFO + FOR UPDATE + Kardex)
  │      │       tg_ventas_historial              (auditoría de estado)
  │      │
  │      └─ session.add(Documento(id_venta, tipo_documento))
  │
  ├─ 7. Excepciones:
  │      DBAPIError → InsufficientStockError (si msg contiene "Stock insuficiente")
  │      DBAPIError → DatabaseError (otro error de trigger)
  │      Exception → DatabaseError (error inesperado)
  │
  └─ 8. Retornar VentaResponse { id_venta, estado, estado_pago, total, puntos_ganados, fecha_venta }
```

### Estados y Transiciones

```
Venta creada:  estado=PENDIENTE  estado_pago=PENDIENTE
                   │
                   ├── PUT /ventas/{id}/pagar (ADMIN)
                   │   └── estado_pago=PAGADO → tg_ventas_otorgar_puntos
                   │
                   ├── Celery expire_pending (5 min)
                   │   └── estado=ANULADO → tg_ventas_anular (revierte stock)
                   │
                   └── Anulación manual (futuro)
                       └── estado=ANULADO → tg_ventas_anular
```

---

## 5. Concurrencia e Integridad Transaccional

### Estrategia

| Capa | Mecanismo | Detalle |
|------|-----------|---------|
| PostgreSQL | `FOR UPDATE` en trigger FEFO | `tg_detalles_venta_asignar_lotes` bloquea `productos` y `lotes` en orden consistente |
| Backend | `session.begin()` | Transacción explícita. Si el trigger falla → rollback automático |
| Backend | Pre-validación sin lock | Optimización fast-fail. No compromete integridad porque el trigger re-valida con FOR UPDATE |
| Backend | `DBAPIError` + `exc.orig` | Captura errores de trigger y los mapea a excepciones de dominio |

### Escenario de concurrencia (último producto)

```
T0: Cliente A lee stock=1 → pasa pre-validación
T1: Cliente B lee stock=1 → pasa pre-validación
T2: A inserta DetalleVenta → trigger bloquea lotes FOR UPDATE → deduce stock → COMMIT
T3: B inserta DetalleVenta → trigger obtiene lock → ve stock=0 → RAISE EXCEPTION → ROLLBACK
T4: A recibe 201 Created. B recibe 422 InsufficientStockError.
```

**Conclusión:** No hay overselling. El FOR UPDATE en el trigger serializa el acceso concurrente.

---

## 6. Celery: Expiración Automática de Ventas

```python
# app/infrastructure/workers/tasks/ventas.py
@celery_app.task(name="app.infrastructure.workers.tasks.ventas.expire_pending")
def expire_pending(self) -> dict:
    # UPDATE ventas SET estado = 'ANULADO'
    # WHERE estado = 'PENDIENTE' AND estado_pago = 'PENDIENTE'
    #   AND fecha_venta < NOW() - INTERVAL '15 minutes'
```

**Beat schedule:** Cada 300 segundos (5 minutos).

La anulación dispara `tg_ventas_anular` que revierte stock, libera cupón y contra-asienta puntos.

---

## 7. Schemas Pydantic

### Cart Schemas

```python
class AddCartItemRequest(BaseModel):
    id_producto: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)
    es_paquete: bool = False
    id_paquete: int | None = None

class UpdateCartItemRequest(BaseModel):
    cantidad: int = Field(..., gt=0)

class CartItemResponse(BaseModel):
    id_producto: int
    nombre: str
    cantidad: int
    precio_unitario: Decimal
    imagen_url: str | None = None
    es_paquete: bool = False
    id_paquete: int | None = None

class CartResponse(BaseModel):
    items: list[CartItemResponse] = []
    total_items: int = 0
    subtotal: Decimal = Decimal("0.00")
    updated_at: datetime | None = None

class CartCheckoutResponse(BaseModel):
    id_venta: int
    total: Decimal
    estado: str
    estado_pago: str
    mensaje: str = "Venta creada desde el carrito exitosamente."
```

### Venta Schemas

```python
class ItemProducto(BaseModel):
    id_producto: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)

class ItemPaquete(BaseModel):
    id_paquete: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)

class VentaRequest(BaseModel):
    origen_venta: OrigenVentaEnum = OrigenVentaEnum.WEB
    id_cupon_cliente: int | None = None
    productos: list[ItemProducto] | None = []
    paquetes: list[ItemPaquete] | None = []
    tipo_pago: TipoPagoEnum = TipoPagoEnum.TARJETA

    def has_items(self) -> bool:
        return len(self.productos or []) > 0 or len(self.paquetes or []) > 0

class VentaResponse(BaseModel):
    id_venta: int
    id_cliente: int
    estado: str
    estado_pago: str
    total: Decimal
    puntos_ganados: int
    fecha_venta: datetime
    model_config = ConfigDict(from_attributes=True)
```

---

## 8. Endpoints de la API

### Cart (`/api/v1/cart`)

| Método | Ruta | Auth | Handler | Descripción |
|--------|------|------|---------|-------------|
| `GET` | `/` | CLIENTE | `get_cart` → `CartService.get_cart()` | Obtener carrito del usuario |
| `POST` | `/items` | CLIENTE | `add_item` → `CartService.add_item()` | Agregar producto o paquete |
| `PUT` | `/items/{id_producto}` | CLIENTE | `update_item` → `CartService.update_item()` | Actualizar cantidad |
| `DELETE` | `/items/{id_producto}` | CLIENTE | `remove_item` → `CartService.remove_item()` | Eliminar item |
| `DELETE` | `/` | CLIENTE | `clear_cart` → `CartService.clear_cart()` | Vaciar carrito (204) |

### Ventas (`/api/v1/ventas`)

| Método | Ruta | Auth | Handler | Descripción |
|--------|------|------|---------|-------------|
| `POST` | `/checkout` | CLIENTE | `checkout` → `VentaService.create_checkout()` | Checkout con items explícitos |
| `POST` | `/checkout/cart` | CLIENTE | `checkout_from_cart` → Cart + VentaService | Checkout desde carrito Redis |
| `PUT` | `/{id_venta}/pagar` | ADMIN | `confirmar_pago` → `VentaService.confirmar_pago()` | Marcar venta como PAGADA |
| `GET` | `/` | CLIENTE | `list_ventas` → `VentaService.get_by_cliente()` | Historial de ventas del cliente |
| `GET` | `/{id_venta}` | CLIENTE | `get_venta` → `VentaService.get_by_id()` | Detalle de venta por ID |

---

## 9. Reglas de Negocio Implementadas

| Regla | Donde se aplica |
|-------|-----------------|
| Carrito vacío no permite checkout | `has_items()` en `VentaRequest` |
| Producto inexistente → 404 | `NotFoundError` en `create_checkout()` |
| Producto inactivo → 422 | `BusinessRuleError` en `create_checkout()` |
| Stock insuficiente → 422 | `InsufficientStockError` (pre-validación + trigger) |
| Paquete expandido en detalles_venta | `create_checkout()` |
| Snapshot de composición guardado en JSONB | `VentaPaquete.composicion_snapshot_json` |
| FEFO y Kardex exclusivamente por triggers | `tg_detalles_venta_asignar_lotes` en PostgreSQL |
| IGV 18% calculado en backend | `base_imponible = subtotal / 1.18` |
| Documento BOLETA generado automáticamente | `session.add(Documento(...))` en la transacción |
| Venta creada como PENDIENTE/PENDIENTE | Constructor de `Venta` |
| Pago confirmado solo por ADMIN | `AdminUser` en `PUT /ventas/{id}/pagar` |
| Puntos otorgados al pagar | `tg_ventas_otorgar_puntos` (trigger PostgreSQL) |
| Stock revertido al anular | `tg_ventas_anular` (trigger PostgreSQL) |
| Cupón liberado al anular | `tg_ventas_anular` |
| Expiración automática de ventas pendientes | Celery `expire_pending` cada 5 min |
| TTL de carrito 7 días con sliding expiration | `CartService._persist()` usa `setex` |

---

## 10. Límites y Restricciones

| Restricción | Detalle |
|-------------|---------|
| Sin pasarelas de pago | No se integran Culqi, Izipay ni MercadoPago. Alcance universitario. |
| Solo TARJETA como tipo_pago | `TipoPagoEnum` tiene un único valor. EFECTIVO/YAPE/TRANSFERENCIA fueron deprecados. |
| Solo WEB como origen_venta | `OrigenVentaEnum` tiene un único valor. |
| Documento sin numeración | `numero_serie` y `numero_correlativo` en `None`. La tabla `contadores_documentos` no existe. |
| Sin PDF de comprobante | `url_archivo` queda `None`. La generación PDF con WeasyPrint está pendiente (Fase 6). |
| Sin descuento por cupón | `id_cupon_cliente` se acepta en el request pero el service no aplica descuento (`monto_descuento_cupon` queda en 0). |
| CartService instanciado manualmente en router de checkout | `CartService(redis)` en `checkout_from_cart` no usa DI. Redis es singleton así que es funcional. |

---

## 11. Estado de Implementación

| Componente | Estado |
|------------|--------|
| ORM Venta, DetalleVenta, MetodoPago, Documento | ✅ Implementado |
| Columnas `base_imponible`, `igv` en ORM Venta | ✅ Implementado |
| Módulo Cart (schemas, service, router, DI) | ✅ Implementado |
| CartService Redis (TTL 7d, sliding) | ✅ Implementado |
| VentaService.create_checkout (transaccional) | ✅ Implementado |
| VentaService.confirmar_pago | ✅ Implementado |
| VentaService.get_by_cliente | ✅ Implementado |
| Expansión de paquetes en checkout | ✅ Implementado |
| Generación automática de Documento | ✅ Implementado |
| Celery expire_pending_ventas | ✅ Implementado |
| 5 endpoints Cart | ✅ Implementado |
| 5 endpoints Ventas | ✅ Implementado |
| Cart router registrado en api_router | ✅ Implementado |
| Tests unitarios CartService (12 tests) | ✅ Implementado |
| Tests unitarios VentaService (18 tests) | ✅ Implementado |
| Tests E2E Cart API (8 tests) | ✅ Implementado |
| Tests E2E Checkout API (7 tests) | ✅ Implementado |
| Tests integración Checkout Flow (4 tests) | ✅ Implementado |
| Excepciones de dominio (NotFoundError, InsufficientStockError) | ✅ Implementado |
| Numeración de documentos (serie/correlativo) | ⬜ Pendiente |
| PDF de comprobante (WeasyPrint) | ⬜ Pendiente (Fase 6) |
| Aplicación de descuento por cupón | ⬜ Pendiente (Fase 5) |

---

## 12. Riesgos Conocidos

| Riesgo | Nivel | Detalle |
|--------|-------|---------|
| Columnas `base_imponible`/`igv` no existen en instancia NeonDB actual | ALTO | La migración M05 las define, pero no se han aplicado al schema en producción. Requiere ejecutar `ALTER TABLE`. |
| `session.refresh()` fuera del bloque `begin()` | MEDIO | En `create_checkout` y `confirmar_pago`. Funciona con `expire_on_commit=False` pero es frágil. |
| `confirmar_pago` sin FOR UPDATE en lectura pre-transacción | BAJO | Dos admins concurrentes podrían intentar pagar la misma venta. Mitigado por validación dentro del `begin()`. |
| CartService no usa DI en checkout_from_cart | BAJO | Instanciado manualmente. Redis es singleton así que es funcional. |

---

## 13. Referencias

- **Skill de checkout:** [`_docs/skills/04_CHECKOUT_FLOW.md`](../skills/04_CHECKOUT_FLOW.md)
- **Skill de arquitectura:** [`_docs/skills/02_BACKEND_ARCHITECTURE.md`](../skills/02_BACKEND_ARCHITECTURE.md)
- **Skill de background tasks:** [`_docs/skills/09_BACKGROUND_TASKS.md`](../skills/09_BACKGROUND_TASKS.md)
- **SQL Módulo ventas:** [`_docs/sql_modules/M05_ventas_pagos.sql`](../sql_modules/M05_ventas_pagos.sql)
- **SQL Skill ventas:** [`_docs/sql_modules/SK-SQL-05_ventas_pagos.md`](../sql_modules/SK-SQL-05_ventas_pagos.md)
- **Tests Fase 4:** `tests/unit/test_venta_service.py`, `tests/unit/test_cart_service.py`, `tests/e2e/test_cart_api.py`, `tests/e2e/test_checkout_api.py`, `tests/integration/test_checkout_flow.py`
